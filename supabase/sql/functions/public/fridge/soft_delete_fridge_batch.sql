-- Function: public.soft_delete_fridge_batch
-- Source: supabase/migrations/076_fix_meal_usage_guards_to_dish_ingredients.sql
-- 역할: 냉장고 배치를 소프트 삭제합니다.
-- 동작:
-- 1. 권한을 검증하고, dish_ingredients 기준으로 해당 배치의 식단 사용 여부를 확인합니다.
-- 2. 배치를 소프트 삭제하고 아이템 총량을 동기화합니다.
-- 3. 마지막 배치였고 식단이 그 아이템을 참조하지 않을 때만 아이템까지 소프트 삭제합니다.
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
