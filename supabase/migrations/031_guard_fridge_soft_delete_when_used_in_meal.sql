-- Guard fridge/grocery soft-delete when stock is referenced by meals.
-- errcode domain code: F0001 (fridge), C0001 (grocery)

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
    raise exception 'ingredient not found';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception 'permission denied';
  end if;

  if v_linked_fridge_batch_id is not null then
    select exists (
      select 1 from public.meal_batch_usages mbu where mbu.batch_id = v_linked_fridge_batch_id
    )
    into v_is_used_in_meal;
  elsif v_linked_fridge_item_id is not null then
    select exists (
      select 1 from public.meal_batch_usages mbu where mbu.fridge_item_id = v_linked_fridge_item_id
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
    raise exception 'fridge item not found';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception 'permission denied';
  end if;

  select exists (
    select 1
    from public.meal_batch_usages mbu
    where mbu.fridge_item_id = p_fridge_item_id
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
    raise exception 'fridge batch not found';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception 'permission denied';
  end if;

  select exists (
    select 1
    from public.meal_batch_usages mbu
    where mbu.batch_id = p_batch_id
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

  if not exists (
    select 1
    from public.fridge_item_batches b
    where b.fridge_item_id = v_fridge_item_id
      and b.deleted_at is null
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

select pg_notify('pgrst', 'reload schema');
