-- Migration: 076_fix_meal_usage_guards_to_dish_ingredients
-- 역할: "식단이 이 재고를 쓰고 있는가" 판정을 meal_batch_usages가 아니라 dish_ingredients 기준으로 바로잡습니다.
-- 동작:
-- 1. meal_batch_usages는 "얼마를 차감했는가"(수량 원장)를 기록하며,
--    g·kg·ml·L 재료의 usage_status='used'는 차감이 없어 행이 생기지 않습니다.
--    그래서 이 테이블로 사용 여부를 판정하면 무게·부피 재료가 가드를 통과해 삭제됩니다.
-- 2. 사용 여부의 완전한 출처는 dish_ingredients이므로 세 소프트 삭제 함수의 가드를 그쪽으로 옮깁니다.
--    (프런트엔드는 이미 has_meal_usage(dish_ingredients 기준)로 우회하고 있었습니다.)
-- 3. soft_delete_fridge_batch가 마지막 배치 삭제 시 품목까지 소프트 삭제하던 경로에,
--    식단이 아직 그 품목을 참조하면 품목은 남기는 예외를 추가합니다.
--    batch_id가 NULL인 과거 식단 행을 끊어 빈 값으로 만들지 않기 위함입니다.

-- 1) 냉장고 품목 소프트 삭제
create or replace function public.soft_delete_fridge_item(p_fridge_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_is_used_in_meal boolean := false;
begin
  select household_id
    into v_household_id
  from public.fridge_items
  where id = p_fridge_item_id
    and deleted_at is null;

  if v_household_id is null then
    raise exception using
      errcode = 'F0004',
      message = '냉장고 재료를 찾을 수 없습니다.',
      hint = 'FRIDGE_ITEM_NOT_FOUND';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  select exists (
    select 1
    from public.dish_ingredients di
    where di.fridge_item_id = p_fridge_item_id
  )
  into v_is_used_in_meal;

  if v_is_used_in_meal then
    raise exception using
      errcode = 'F0001',
      message = '식단에 등록되어 있는 재료는 삭제할 수 없습니다.',
      hint = 'FRIDGE_IN_USE_IN_MEAL';
  end if;

  update public.fridge_item_batches
  set deleted_at = now(),
      updated_at = now()
  where fridge_item_id = p_fridge_item_id
    and deleted_at is null;

  update public.ingredients
  set linked_fridge_item_id = null,
      linked_fridge_batch_id = null
  where linked_fridge_item_id = p_fridge_item_id;

  perform public.refresh_fridge_item_total_count(p_fridge_item_id);

  update public.fridge_items
  set deleted_at = now(),
      updated_at = now()
  where id = p_fridge_item_id
    and deleted_at is null;
end;
$$;

-- 2) 냉장고 배치 소프트 삭제
create or replace function public.soft_delete_fridge_batch(p_batch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fridge_item_id uuid;
  v_household_id uuid;
  v_is_used_in_meal boolean := false;
begin
  select b.fridge_item_id, f.household_id
    into v_fridge_item_id, v_household_id
  from public.fridge_item_batches b
  join public.fridge_items f on f.id = b.fridge_item_id
  where b.id = p_batch_id
    and b.deleted_at is null
    and f.deleted_at is null;

  if v_fridge_item_id is null then
    raise exception using
      errcode = 'F0005',
      message = '재고 배치를 찾을 수 없습니다.',
      hint = 'FRIDGE_BATCH_NOT_FOUND';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  select exists (
    select 1
    from public.dish_ingredients di
    where di.batch_id = p_batch_id
  )
  into v_is_used_in_meal;

  if v_is_used_in_meal then
    raise exception using
      errcode = 'F0001',
      message = '식단에 등록되어 있는 재료는 삭제할 수 없습니다.',
      hint = 'FRIDGE_IN_USE_IN_MEAL';
  end if;

  update public.ingredients
  set linked_fridge_batch_id = null
  where linked_fridge_batch_id = p_batch_id;

  update public.fridge_item_batches
  set deleted_at = now(),
      updated_at = now()
  where id = p_batch_id;

  perform public.refresh_fridge_item_total_count(v_fridge_item_id);

  -- 마지막 배치였다면 품목도 정리한다.
  -- 다만 식단이 아직 이 품목을 참조하고 있으면(batch_id가 NULL인 과거 행 포함)
  -- 품목을 남겨 식단의 재료 이름이 빈 값이 되지 않게 한다.
  if not exists (
    select 1
    from public.fridge_item_batches b
    where b.fridge_item_id = v_fridge_item_id
      and b.deleted_at is null
  ) and not exists (
    select 1
    from public.dish_ingredients di
    where di.fridge_item_id = v_fridge_item_id
  ) then
    update public.ingredients
    set linked_fridge_item_id = null,
        linked_fridge_batch_id = null
    where linked_fridge_item_id = v_fridge_item_id;

    update public.fridge_items
    set deleted_at = now(),
        updated_at = now()
    where id = v_fridge_item_id
      and deleted_at is null;
  end if;
end;
$$;

-- 3) 장보기 항목 소프트 삭제
create or replace function public.soft_delete_ingredient(p_ingredient_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_linked_fridge_item_id uuid;
  v_linked_fridge_batch_id uuid;
  v_is_used_in_meal boolean := false;
begin
  select household_id, linked_fridge_item_id, linked_fridge_batch_id
    into v_household_id, v_linked_fridge_item_id, v_linked_fridge_batch_id
  from public.ingredients
  where id = p_ingredient_id
    and deleted_at is null;

  if v_household_id is null then
    raise exception using
      errcode = 'I0005',
      message = '재료를 찾을 수 없습니다.',
      hint = 'INGREDIENT_NOT_FOUND';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  if v_linked_fridge_batch_id is not null then
    select exists (
      select 1 from public.dish_ingredients di where di.batch_id = v_linked_fridge_batch_id
    )
    into v_is_used_in_meal;
  elsif v_linked_fridge_item_id is not null then
    select exists (
      select 1 from public.dish_ingredients di where di.fridge_item_id = v_linked_fridge_item_id
    )
    into v_is_used_in_meal;
  end if;

  if v_is_used_in_meal then
    raise exception using
      errcode = 'C0001',
      message = '식단에 등록되어 있는 재료는 삭제할 수 없습니다.',
      hint = 'GROCERY_IN_USE_IN_MEAL';
  end if;

  update public.ingredients
  set deleted_at = now(),
      updated_at = now()
  where id = p_ingredient_id
    and deleted_at is null;
end;
$$;

select pg_notify('pgrst', 'reload schema');
