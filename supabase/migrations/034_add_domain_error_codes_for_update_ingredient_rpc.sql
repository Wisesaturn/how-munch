-- ============================================================
-- Add domain error code to update_ingredient_with_fridge
-- ============================================================

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
    raise exception 'ingredient not found';
  end if;

  v_household_id := v_ingredient.household_id;
  if not public.is_household_member(v_household_id) then
    raise exception 'permission denied';
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
      category = case
        when p_updates ? 'category' then coalesce(nullif(trim(p_updates->>'category'), ''), i.category)
        else i.category
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
      category,
      unit,
      total_count,
      max_count,
      is_subdivided,
      from_grocery
    )
    values (
      v_ingredient.household_id,
      v_ingredient.name,
      v_ingredient.category,
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
      category,
      unit,
      total_count,
      max_count,
      is_subdivided,
      from_grocery
    )
    values (
      v_ingredient.household_id,
      v_ingredient.name,
      v_ingredient.category,
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
      category = v_ingredient.category,
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
          message = format('식단에서 이미 사용한 수량(%s)보다 작게 설정할 수 없습니다.', v_used_amount),
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
      message = format('식단에서 이미 사용한 수량(%s)보다 작게 설정할 수 없습니다.', v_used_amount),
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

revoke all on function public.update_ingredient_with_fridge(uuid, jsonb) from public;
grant execute on function public.update_ingredient_with_fridge(uuid, jsonb) to authenticated;

-- ============================================================
-- Include 033 scope: fridge batch guarded update + meal upsert
-- ============================================================

create or replace function public.update_fridge_batch_guarded(
  p_batch_id uuid,
  p_updates jsonb default '{}'::jsonb
)
returns public.fridge_item_batches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_from_grocery boolean;
  v_used_amount numeric := 0;
  v_requested_total_quantity numeric;
  v_result public.fridge_item_batches%rowtype;
begin
  select f.household_id, f.from_grocery
    into v_household_id, v_from_grocery
  from public.fridge_item_batches b
  join public.fridge_items f on f.id = b.fridge_item_id
  where b.id = p_batch_id
    and b.deleted_at is null
    and f.deleted_at is null
  for update of b, f;

  if not found then
    raise exception 'fridge batch not found';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception 'permission denied';
  end if;

  if p_updates ? 'quantity' then
    if v_from_grocery then
      raise exception using
        errcode = 'F0002',
        message = '장보기에서 등록한 재고는 장보기에서만 수량을 변경할 수 있습니다.',
        hint = 'FRIDGE_QUANTITY_MANAGED_IN_GROCERY';
    end if;

    v_requested_total_quantity := (p_updates->>'quantity')::numeric;
    if v_requested_total_quantity is null then
      raise exception 'invalid quantity';
    end if;

    select coalesce(sum(mbu.amount), 0)
      into v_used_amount
    from public.meal_batch_usages mbu
    where mbu.batch_id = p_batch_id;

    if v_requested_total_quantity < v_used_amount then
      raise exception using
        errcode = 'F0003',
        message = format('식단에서 사용 중인 수량(%s)보다 작게 설정할 수 없습니다.', v_used_amount),
        hint = 'FRIDGE_QUANTITY_BELOW_MEAL_USAGE';
    end if;
  end if;

  update public.fridge_item_batches b
  set quantity = case
        when p_updates ? 'quantity' then v_requested_total_quantity - v_used_amount
        else b.quantity
      end,
      purchased_date = case
        when p_updates ? 'purchased_date' then coalesce((p_updates->>'purchased_date')::date, b.purchased_date)
        else b.purchased_date
      end,
      expiry_date = case
        when p_updates ? 'expiry_date' then (p_updates->>'expiry_date')::date
        else b.expiry_date
      end,
      memo = case
        when p_updates ? 'memo' then (p_updates->>'memo')::text
        else b.memo
      end,
      updated_at = now()
  where b.id = p_batch_id
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.upsert_meal_with_usage(
  p_household_id uuid,
  p_date date,
  p_type text,
  p_dishes jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meal_id uuid;
  v_dish jsonb;
  v_ingredient jsonb;
  v_dish_id uuid;
  v_name text;
  v_fridge_item_id uuid;
  v_amount numeric;
  v_remaining numeric;
  v_batch record;
  v_usage record;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_household_member(p_household_id) then
    raise exception 'permission denied';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(format('meal:%s:%s:%s', p_household_id::text, p_date::text, p_type), 0)
  );

  insert into public.meals (household_id, date, type)
  values (p_household_id, p_date, p_type)
  on conflict (household_id, date, type)
  do update set updated_at = now()
  returning id into v_meal_id;

  for v_usage in
    select batch_id, amount
    from public.meal_batch_usages
    where meal_id = v_meal_id
  loop
    update public.fridge_item_batches
    set quantity = quantity + v_usage.amount,
        updated_at = now()
    where id = v_usage.batch_id
      and deleted_at is null;
  end loop;

  delete from public.meal_batch_usages where meal_id = v_meal_id;
  delete from public.dishes where meal_id = v_meal_id;

  if p_dishes is null or jsonb_typeof(p_dishes) <> 'array' then
    return v_meal_id;
  end if;

  for v_dish in
    select value from jsonb_array_elements(p_dishes)
  loop
    v_name := coalesce(nullif(trim(v_dish->>'name'), ''), '[이름 없음]');

    insert into public.dishes (meal_id, name, sort_order)
    values (
      v_meal_id,
      v_name,
      coalesce((v_dish->>'sort_order')::integer, 0)
    )
    returning id into v_dish_id;

    if jsonb_typeof(v_dish->'ingredients') = 'array' then
      for v_ingredient in
        select value from jsonb_array_elements(v_dish->'ingredients')
      loop
        v_fridge_item_id := (v_ingredient->>'fridge_item_id')::uuid;
        v_amount := coalesce((v_ingredient->>'amount')::numeric, 0);

        if v_fridge_item_id is null or v_amount <= 0 then
          continue;
        end if;

        insert into public.dish_ingredients (dish_id, fridge_item_id, amount)
        values (v_dish_id, v_fridge_item_id, v_amount);
      end loop;
    end if;
  end loop;

  for v_usage in
    select di.fridge_item_id, sum(di.amount) as total_amount
    from public.dish_ingredients di
    join public.dishes d on d.id = di.dish_id
    where d.meal_id = v_meal_id
    group by di.fridge_item_id
    order by di.fridge_item_id
  loop
    v_remaining := v_usage.total_amount;

    for v_batch in
      select b.id, b.quantity
      from public.fridge_item_batches b
      where b.fridge_item_id = v_usage.fridge_item_id
        and b.deleted_at is null
      order by b.purchased_date asc, b.created_at asc
      for update
    loop
      exit when v_remaining <= 0;

      if coalesce(v_batch.quantity, 0) <= 0 then
        continue;
      end if;

      v_amount := least(v_batch.quantity, v_remaining);

      update public.fridge_item_batches
      set quantity = quantity - v_amount,
          updated_at = now()
      where id = v_batch.id;

      insert into public.meal_batch_usages (meal_id, fridge_item_id, batch_id, amount)
      values (v_meal_id, v_usage.fridge_item_id, v_batch.id, v_amount);

      v_remaining := v_remaining - v_amount;
    end loop;

    if v_remaining > 0 then
      raise exception using
        errcode = 'M0001',
        message = '냉장고 재고가 부족합니다. 식단 재료 수량을 확인해 주세요.',
        hint = 'MEAL_STOCK_INSUFFICIENT';
    end if;
  end loop;

  return v_meal_id;
end;
$$;

revoke all on function public.update_fridge_batch_guarded(uuid, jsonb) from public;
grant execute on function public.update_fridge_batch_guarded(uuid, jsonb) to authenticated;
grant execute on function public.upsert_meal_with_usage(uuid, date, text, jsonb) to authenticated;

select pg_notify('pgrst', 'reload schema');
