-- Complete category_id transition: rewrite RPCs to category_id and drop legacy category text columns.

create or replace function public.normalize_ingredient_category_id(
  p_household_id uuid,
  p_category_id uuid default null
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_category_id uuid;
begin
  if p_category_id is null then
    return public.resolve_ingredient_category_id(p_household_id, null);
  end if;

  select ic.id
    into v_category_id
  from public.ingredient_categories ic
  where ic.id = p_category_id
    and (ic.household_id is null or ic.household_id = p_household_id)
  limit 1;

  if v_category_id is null then
    raise exception 'category id not found'
      using errcode = 'I0003', hint = 'INGREDIENT_CATEGORY_ID_NOT_FOUND';
  end if;

  return v_category_id;
end;
$$;

revoke all on function public.normalize_ingredient_category_id(uuid, uuid) from public;
grant execute on function public.normalize_ingredient_category_id(uuid, uuid) to authenticated;

drop function if exists public.add_ingredient_with_fridge(uuid, text, integer, text, text, numeric, text, date);
create function public.add_ingredient_with_fridge(
  p_household_id uuid,
  p_name text,
  p_price integer default 0,
  p_store text default null,
  p_category_id uuid default null,
  p_count numeric default 1,
  p_unit text default 'count',
  p_date date default current_date
)
returns public.ingredients
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_ingredient public.ingredients%rowtype;
  v_fridge_item_id uuid;
  v_batch_id uuid;
  v_category_id uuid;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_household_member(p_household_id) then
    raise exception 'permission denied';
  end if;

  v_category_id := public.normalize_ingredient_category_id(p_household_id, p_category_id);

  insert into public.ingredients (
    household_id,
    user_id,
    date,
    name,
    price,
    store,
    category_id,
    count,
    unit
  )
  values (
    p_household_id,
    v_user_id,
    coalesce(p_date, current_date),
    p_name,
    coalesce(p_price, 0),
    p_store,
    v_category_id,
    coalesce(p_count, 1),
    coalesce(p_unit, 'count')
  )
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
end;
$$;

revoke all on function public.add_ingredient_with_fridge(uuid, text, integer, text, uuid, numeric, text, date) from public;
grant execute on function public.add_ingredient_with_fridge(uuid, text, integer, text, uuid, numeric, text, date) to authenticated;

drop function if exists public.create_fridge_item_with_batch(uuid, text, text, text, boolean, boolean, numeric, date, date, text);
create function public.create_fridge_item_with_batch(
  p_household_id uuid,
  p_name text,
  p_category_id uuid default null,
  p_unit text default 'count',
  p_is_subdivided boolean default false,
  p_from_grocery boolean default false,
  p_quantity numeric default 1,
  p_purchased_date date default current_date,
  p_expiry_date date default null,
  p_memo text default null
)
returns public.fridge_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.fridge_items%rowtype;
  v_category_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_household_member(p_household_id) then
    raise exception 'permission denied';
  end if;

  v_category_id := public.normalize_ingredient_category_id(p_household_id, p_category_id);

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
    p_household_id,
    p_name,
    v_category_id,
    coalesce(p_unit, 'count'),
    coalesce(p_quantity, 1),
    coalesce(p_quantity, 1),
    coalesce(p_is_subdivided, false),
    coalesce(p_from_grocery, false)
  )
  returning * into v_item;

  insert into public.fridge_item_batches (
    fridge_item_id,
    quantity,
    purchased_date,
    expiry_date,
    memo
  )
  values (
    v_item.id,
    coalesce(p_quantity, 1),
    coalesce(p_purchased_date, current_date),
    p_expiry_date,
    p_memo
  );

  return v_item;
end;
$$;

revoke all on function public.create_fridge_item_with_batch(uuid, text, uuid, text, boolean, boolean, numeric, date, date, text) from public;
grant execute on function public.create_fridge_item_with_batch(uuid, text, uuid, text, boolean, boolean, numeric, date, date, text) to authenticated;

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

create or replace function public.sync_category_reference_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.category_id := public.normalize_ingredient_category_id(new.household_id, new.category_id);
  return new;
end;
$$;

drop trigger if exists sync_category_reference_columns_on_ingredients on public.ingredients;
create trigger sync_category_reference_columns_on_ingredients
before insert or update of household_id, category_id on public.ingredients
for each row execute function public.sync_category_reference_columns();

drop trigger if exists sync_category_reference_columns_on_fridge_items on public.fridge_items;
create trigger sync_category_reference_columns_on_fridge_items
before insert or update of household_id, category_id on public.fridge_items
for each row execute function public.sync_category_reference_columns();

drop trigger if exists sync_items_category_code_after_category_update on public.ingredient_categories;
drop function if exists public.sync_items_category_code_after_category_update();

alter table public.ingredients
  drop column if exists category;

alter table public.fridge_items
  drop column if exists category;
