-- Function: public.update_ingredient_with_fridge
-- Source: supabase/migrations/038_drop_legacy_category_columns_and_use_category_id.sql
-- 역할: 장보기 항목 수정 시 연결 냉장고 재고를 정합성 있게 동기화합니다.
-- 동작:
-- 1. ingredient 업데이트 후 연결 item/batch 존재 상태를 분기 처리합니다.
-- 2. 식단 사용량보다 작은 수량 설정을 차단하고 배치 수량을 재계산합니다.
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
  v_fridge_item_id uuid;
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

  if v_ingredient.linked_fridge_item_id is null then
    insert into public.fridge_items (
      household_id,
      name,
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
      v_ingredient.category_id,
      v_ingredient.unit,
      v_ingredient.count,
      v_ingredient.count,
      false,
      true
    )
    returning id into v_fridge_item_id;

    insert into public.fridge_item_batches (
      fridge_item_id,
      quantity,
      purchased_date,
      expiry_date,
      memo
    )
    values (
      v_fridge_item_id,
      v_ingredient.count,
      v_ingredient.date,
      null,
      null
    )
    returning id into v_batch_id;

    update public.ingredients
    set linked_fridge_item_id = v_fridge_item_id,
        linked_fridge_batch_id = v_batch_id,
        updated_at = now()
    where id = v_ingredient.id
    returning * into v_ingredient;

    return v_ingredient;
  end if;

  select f.id
    into v_fridge_item_id
  from public.fridge_items f
  where f.id = v_ingredient.linked_fridge_item_id
    and f.deleted_at is null
  for update;

  if not found then
    update public.ingredients
    set linked_fridge_item_id = null,
        linked_fridge_batch_id = null,
        updated_at = now()
    where id = v_ingredient.id
    returning * into v_ingredient;

    insert into public.fridge_items (
      household_id,
      name,
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
      v_ingredient.category_id,
      v_ingredient.unit,
      v_ingredient.count,
      v_ingredient.count,
      false,
      true
    )
    returning id into v_fridge_item_id;

    insert into public.fridge_item_batches (
      fridge_item_id,
      quantity,
      purchased_date,
      expiry_date,
      memo
    )
    values (
      v_fridge_item_id,
      v_ingredient.count,
      v_ingredient.date,
      null,
      null
    )
    returning id into v_batch_id;

    update public.ingredients
    set linked_fridge_item_id = v_fridge_item_id,
        linked_fridge_batch_id = v_batch_id,
        updated_at = now()
    where id = v_ingredient.id
    returning * into v_ingredient;

    return v_ingredient;
  end if;

  update public.fridge_items
  set name = v_ingredient.name,
      category_id = v_ingredient.category_id,
      unit = v_ingredient.unit,
      max_count = v_ingredient.count,
      from_grocery = true,
      updated_at = now()
  where id = v_fridge_item_id;

  if v_ingredient.linked_fridge_batch_id is not null then
    select b.id
      into v_batch_id
    from public.fridge_item_batches b
    where b.id = v_ingredient.linked_fridge_batch_id
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
      set quantity = v_ingredient.count - v_used_amount,
          purchased_date = v_ingredient.date,
          updated_at = now()
      where id = v_batch_id;

      return v_ingredient;
    end if;
  end if;

  select coalesce(sum(mbu.amount), 0)
    into v_used_amount
  from public.meal_batch_usages mbu
  where mbu.fridge_item_id = v_fridge_item_id;

  if v_ingredient.count < v_used_amount then
    raise exception using
      errcode = 'F0003',
      message = '식단에서 사용 중인 수량보다 작게 설정할 수 없습니다.',
      hint = 'FRIDGE_QUANTITY_BELOW_MEAL_USAGE';
  end if;

  insert into public.fridge_item_batches (
    fridge_item_id,
    quantity,
    purchased_date,
    expiry_date,
    memo
  )
  values (
    v_fridge_item_id,
    v_ingredient.count - v_used_amount,
    v_ingredient.date,
    null,
    null
  )
  returning id into v_batch_id;

  update public.ingredients
  set linked_fridge_batch_id = v_batch_id,
      updated_at = now()
  where id = v_ingredient.id
  returning * into v_ingredient;

  return v_ingredient;
end;
$$;
