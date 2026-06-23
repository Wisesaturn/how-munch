-- Migration: 069_fix_dish_ingredients_sync_on_fridge_rename
-- 역할: 장보기에서 재료 이름/브랜드를 수정해 fridge_item이 교체·소프트 삭제될 때,
--       해당 fridge_item을 참조하는 dish_ingredients도 새 fridge_item으로 동기화한다.
-- 동작:
-- 1. update_ingredient_with_fridge의 두 소프트 삭제 분기에 dish_ingredients 갱신을 추가한다.
-- 2. 기존 데이터 정정: 소프트 삭제된 fridge_item을 참조하는 dish_ingredients를
--    meal_batch_usages를 통해 올바른 fridge_item으로 갱신한다.

/* -------------------------------------------------------------------------------------------------
 * 1. update_ingredient_with_fridge 함수 수정
 * -----------------------------------------------------------------------------------------------*/

create or replace function public.update_ingredient_with_fridge(
  p_ingredient_id uuid,
  p_updates jsonb default '{}'::jsonb
)
returns public.ingredients
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ingredient public.ingredients%rowtype;
  v_household_id uuid;
  v_previous_fridge_item_id uuid;
  v_previous_batch_id uuid;
  v_target_fridge_item_id uuid;
  v_batch_id uuid;
  v_used_amount numeric := 0;
begin
  select *
    into v_ingredient
  from public.ingredients
  where id = p_ingredient_id
    and deleted_at is null
  for update;

  if not found then
    raise exception using
      errcode = 'I0005',
      message = '재료를 찾을 수 없습니다.',
      hint = 'INGREDIENT_NOT_FOUND';
  end if;

  v_household_id := v_ingredient.household_id;
  v_previous_fridge_item_id := v_ingredient.linked_fridge_item_id;
  v_previous_batch_id := v_ingredient.linked_fridge_batch_id;

  if not public.is_household_member(v_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  update public.ingredients i
  set name = case
        when p_updates ? 'name' then coalesce(nullif(trim(p_updates->>'name'), ''), i.name)
        else i.name
      end,
      price = case
        when p_updates ? 'price' then coalesce((p_updates->>'price')::integer, i.price)
        else i.price
      end,
      store = case
        when p_updates ? 'store' then (p_updates->>'store')::text
        else i.store
      end,
      brand = case
        when p_updates ? 'brand' then (p_updates->>'brand')::text
        else i.brand
      end,
      category_id = case
        when p_updates ? 'category_id' then public.normalize_ingredient_category_id(i.household_id, nullif(trim(p_updates->>'category_id'), '')::uuid)
        else i.category_id
      end,
      count = case
        when p_updates ? 'count' then coalesce((p_updates->>'count')::numeric, i.count)
        else i.count
      end,
      unit = case
        when p_updates ? 'unit' then coalesce(nullif(trim(p_updates->>'unit'), ''), i.unit)
        else i.unit
      end,
      date = case
        when p_updates ? 'date' then coalesce((p_updates->>'date')::date, i.date)
        else i.date
      end,
      updated_at = now()
  where i.id = p_ingredient_id
  returning * into v_ingredient;

  select f.id
    into v_target_fridge_item_id
  from public.fridge_items f
  where f.household_id = v_ingredient.household_id
    and f.deleted_at is null
    and lower(btrim(f.name)) = lower(btrim(v_ingredient.name))
    and coalesce(nullif(lower(btrim(f.brand)), ''), '')
      = coalesce(nullif(lower(btrim(v_ingredient.brand)), ''), '')
    and f.unit = v_ingredient.unit
    and f.category_id = v_ingredient.category_id
  order by f.created_at asc
  limit 1
  for update;

  if v_target_fridge_item_id is null then
    insert into public.fridge_items (
      household_id,
      name,
      brand,
      category_id,
      unit,
      total_count,
      max_count,
      is_subdivided,
      from_grocery
    )
    values (
      v_ingredient.household_id,
      v_ingredient.name,
      v_ingredient.brand,
      v_ingredient.category_id,
      v_ingredient.unit,
      v_ingredient.count,
      v_ingredient.count,
      false,
      true
    )
    returning id into v_target_fridge_item_id;
  end if;

  if v_previous_batch_id is not null then
    select b.id
      into v_batch_id
    from public.fridge_item_batches b
    where b.id = v_previous_batch_id
      and b.deleted_at is null
    for update;

    if found then
      select coalesce(sum(mbu.amount), 0)
        into v_used_amount
      from public.meal_batch_usages mbu
      where mbu.batch_id = v_batch_id;

      if v_ingredient.count < v_used_amount then
        raise exception using
          errcode = 'F0003',
          message = '식단에서 사용 중인 수량보다 작게 설정할 수 없습니다.',
          hint = 'FRIDGE_QUANTITY_BELOW_MEAL_USAGE';
      end if;

      update public.fridge_item_batches
      set fridge_item_id = v_target_fridge_item_id,
          quantity = v_ingredient.count - v_used_amount,
          purchased_date = v_ingredient.date,
          updated_at = now()
      where id = v_batch_id;

      update public.meal_batch_usages
      set fridge_item_id = v_target_fridge_item_id
      where batch_id = v_batch_id
        and fridge_item_id is distinct from v_target_fridge_item_id;

      update public.ingredients
      set linked_fridge_item_id = v_target_fridge_item_id,
          linked_fridge_batch_id = v_batch_id,
          updated_at = now()
      where id = v_ingredient.id
      returning * into v_ingredient;

      if v_previous_fridge_item_id is not null
        and v_previous_fridge_item_id is distinct from v_target_fridge_item_id
        and not exists (
          select 1
          from public.fridge_item_batches b
          where b.fridge_item_id = v_previous_fridge_item_id
            and b.deleted_at is null
        ) then
        -- dish_ingredients 동기화: 소프트 삭제 전 식단 재료 참조를 새 fridge_item으로 갱신
        update public.dish_ingredients
        set fridge_item_id = v_target_fridge_item_id
        where fridge_item_id = v_previous_fridge_item_id;

        update public.ingredients
        set linked_fridge_item_id = null,
            linked_fridge_batch_id = null,
            updated_at = now()
        where linked_fridge_item_id = v_previous_fridge_item_id;

        update public.fridge_items
        set deleted_at = now(),
            updated_at = now()
        where id = v_previous_fridge_item_id
          and deleted_at is null;
      end if;

      return v_ingredient;
    end if;
  end if;

  insert into public.fridge_item_batches (
    fridge_item_id,
    quantity,
    purchased_date,
    expiry_date,
    memo
  )
  values (
    v_target_fridge_item_id,
    v_ingredient.count,
    v_ingredient.date,
    null,
    null
  )
  returning id into v_batch_id;

  update public.ingredients
  set linked_fridge_item_id = v_target_fridge_item_id,
      linked_fridge_batch_id = v_batch_id,
      updated_at = now()
  where id = v_ingredient.id
  returning * into v_ingredient;

  if v_previous_fridge_item_id is not null
    and v_previous_fridge_item_id is distinct from v_target_fridge_item_id
    and not exists (
      select 1
      from public.fridge_item_batches b
      where b.fridge_item_id = v_previous_fridge_item_id
        and b.deleted_at is null
    ) then
    -- dish_ingredients 동기화: 소프트 삭제 전 식단 재료 참조를 새 fridge_item으로 갱신
    update public.dish_ingredients
    set fridge_item_id = v_target_fridge_item_id
    where fridge_item_id = v_previous_fridge_item_id;

    update public.ingredients
    set linked_fridge_item_id = null,
        linked_fridge_batch_id = null,
        updated_at = now()
    where linked_fridge_item_id = v_previous_fridge_item_id;

    update public.fridge_items
    set deleted_at = now(),
        updated_at = now()
    where id = v_previous_fridge_item_id
      and deleted_at is null;
  end if;

  return v_ingredient;
end;
$$;

/* -------------------------------------------------------------------------------------------------
 * 2. 기존 데이터 정정 — 소프트 삭제된 fridge_item을 참조하는 dish_ingredients 갱신
 *    - meal_batch_usages를 경유해 해당 meal에서 살아있는 fridge_item으로 매핑한다.
 *    - 한 meal 내에서 동일 unit+category의 활성 fridge_item이 1개일 때만 갱신 (안전 조건).
 *    - 멱등: 이미 살아있는 fridge_item을 참조하는 dish_ingredients는 변경 없음.
 * -----------------------------------------------------------------------------------------------*/

update public.dish_ingredients di
set fridge_item_id = subq.new_fridge_item_id
from (
  select distinct on (di2.id)
    di2.id,
    mbu.fridge_item_id as new_fridge_item_id
  from public.dish_ingredients di2
  join public.dishes d on d.id = di2.dish_id
  join public.fridge_items dead_fi on dead_fi.id = di2.fridge_item_id
    and dead_fi.deleted_at is not null
  join public.meal_batch_usages mbu on mbu.meal_id = d.meal_id
  join public.fridge_items live_fi on live_fi.id = mbu.fridge_item_id
    and live_fi.deleted_at is null
    and live_fi.unit = dead_fi.unit
    and live_fi.category_id = dead_fi.category_id
  where (
    -- 이 meal에서 dead_fi와 unit+category가 일치하는 활성 fridge_item이 정확히 1개인 경우만 갱신
    select count(distinct mbu2.fridge_item_id)
    from public.meal_batch_usages mbu2
    join public.fridge_items live_fi2 on live_fi2.id = mbu2.fridge_item_id
      and live_fi2.deleted_at is null
      and live_fi2.unit = dead_fi.unit
      and live_fi2.category_id = dead_fi.category_id
    where mbu2.meal_id = d.meal_id
  ) = 1
  order by di2.id
) subq
where di.id = subq.id;
