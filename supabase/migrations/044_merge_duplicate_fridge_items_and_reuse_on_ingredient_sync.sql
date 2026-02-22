create index if not exists idx_fridge_items_merge_lookup
  on public.fridge_items (household_id, lower(btrim(name)), unit, category_id, created_at)
  where deleted_at is null;

create or replace function public.add_ingredient_with_fridge(
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
    raise exception using
      errcode = 'A0001',
      message = '로그인이 필요합니다.',
      hint = 'AUTH_UNAUTHORIZED';
  end if;

  if not public.is_household_member(p_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
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

  select f.id
    into v_fridge_item_id
  from public.fridge_items f
  where f.household_id = v_ingredient.household_id
    and f.deleted_at is null
    and lower(btrim(f.name)) = lower(btrim(v_ingredient.name))
    and f.unit = v_ingredient.unit
    and f.category_id = v_ingredient.category_id
  order by f.created_at asc
  limit 1
  for update;

  if v_fridge_item_id is null then
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
    and f.unit = v_ingredient.unit
    and f.category_id = v_ingredient.category_id
  order by f.created_at asc
  limit 1
  for update;

  if v_target_fridge_item_id is null then
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

-- 기존 활성 fridge_items 중 동일 키(이름/단위/카테고리/household) 중복 정리
-- 대표 아이템: created_at이 가장 오래된 row

do $$
declare
  v_group record;
begin
  for v_group in
    with ranked as (
      select
        f.id,
        first_value(f.id) over (
          partition by f.household_id, lower(btrim(f.name)), f.unit, f.category_id
          order by f.created_at asc, f.id asc
        ) as canonical_id
      from public.fridge_items f
      where f.deleted_at is null
    )
    select
      r.canonical_id,
      array_agg(r.id)::uuid[] as duplicate_ids
    from ranked r
    where r.id <> r.canonical_id
    group by r.canonical_id
  loop
    update public.fridge_items c
    set max_count = greatest(
          c.max_count,
          coalesce(
            (
              select max(d.max_count)
              from public.fridge_items d
              where d.id = any(v_group.duplicate_ids)
            ),
            c.max_count
          )
        ),
        from_grocery = c.from_grocery or coalesce(
          (
            select bool_or(d.from_grocery)
            from public.fridge_items d
            where d.id = any(v_group.duplicate_ids)
          ),
          false
        ),
        updated_at = now()
    where c.id = v_group.canonical_id;

    update public.fridge_item_batches b
    set fridge_item_id = v_group.canonical_id,
        updated_at = now()
    where b.fridge_item_id = any(v_group.duplicate_ids)
      and b.deleted_at is null;

    update public.meal_batch_usages mbu
    set fridge_item_id = v_group.canonical_id
    where mbu.fridge_item_id = any(v_group.duplicate_ids)
      and mbu.fridge_item_id is distinct from v_group.canonical_id;

    update public.dish_ingredients di
    set fridge_item_id = v_group.canonical_id
    where di.fridge_item_id = any(v_group.duplicate_ids)
      and di.fridge_item_id is distinct from v_group.canonical_id;

    update public.ingredients i
    set linked_fridge_item_id = v_group.canonical_id,
        updated_at = now()
    where i.linked_fridge_item_id = any(v_group.duplicate_ids)
      and i.deleted_at is null;

    update public.fridge_items f
    set deleted_at = now(),
        updated_at = now()
    where f.id = any(v_group.duplicate_ids)
      and f.deleted_at is null
      and not exists (
        select 1
        from public.fridge_item_batches b
        where b.fridge_item_id = f.id
          and b.deleted_at is null
      );
  end loop;
end;
$$;
