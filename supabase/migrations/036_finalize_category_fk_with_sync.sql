-- Finalize category migration: enforce FK-based category reference while keeping legacy code column.

create or replace function public.resolve_ingredient_category_id(
  p_household_id uuid,
  p_category_code text
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_category_code text;
  v_category_id uuid;
begin
  v_category_code := coalesce(nullif(trim(p_category_code), ''), 'other');

  if p_household_id is not null then
    select ic.id
      into v_category_id
    from public.ingredient_categories ic
    where ic.household_id = p_household_id
      and ic.code = v_category_code
    limit 1;
  end if;

  if v_category_id is null then
    select ic.id
      into v_category_id
    from public.ingredient_categories ic
    where ic.household_id is null
      and ic.code = v_category_code
    limit 1;
  end if;

  if v_category_id is null then
    select ic.id
      into v_category_id
    from public.ingredient_categories ic
    where ic.household_id is null
      and ic.code = 'other'
    limit 1;
  end if;

  if v_category_id is null then
    raise exception 'other category not found' using errcode = 'I0002', hint = 'INGREDIENT_CATEGORY_OTHER_NOT_FOUND';
  end if;

  return v_category_id;
end;
$$;

revoke all on function public.resolve_ingredient_category_id(uuid, text) from public;
grant execute on function public.resolve_ingredient_category_id(uuid, text) to authenticated;

alter table public.ingredients
  add column if not exists category_id uuid;

alter table public.fridge_items
  add column if not exists category_id uuid;

update public.ingredients i
set category_id = public.resolve_ingredient_category_id(i.household_id, i.category)
where i.category_id is null;

update public.fridge_items f
set category_id = public.resolve_ingredient_category_id(f.household_id, f.category)
where f.category_id is null;

update public.ingredients i
set category = ic.code
from public.ingredient_categories ic
where ic.id = i.category_id
  and i.category is distinct from ic.code;

update public.fridge_items f
set category = ic.code
from public.ingredient_categories ic
where ic.id = f.category_id
  and f.category is distinct from ic.code;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ingredients_category_id_fkey'
  ) then
    alter table public.ingredients
      add constraint ingredients_category_id_fkey
      foreign key (category_id)
      references public.ingredient_categories(id)
      on update cascade
      on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fridge_items_category_id_fkey'
  ) then
    alter table public.fridge_items
      add constraint fridge_items_category_id_fkey
      foreign key (category_id)
      references public.ingredient_categories(id)
      on update cascade
      on delete restrict;
  end if;
end
$$;

alter table public.ingredients
  alter column category_id set not null;

alter table public.fridge_items
  alter column category_id set not null;

create index if not exists idx_ingredients_household_category_id
  on public.ingredients(household_id, category_id)
  where deleted_at is null;

create index if not exists idx_fridge_items_household_category_id
  on public.fridge_items(household_id, category_id)
  where deleted_at is null;

create or replace function public.sync_category_reference_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category_code text;
begin
  if new.category_id is null then
    new.category_id := public.resolve_ingredient_category_id(new.household_id, new.category);
  end if;

  select ic.code
    into v_category_code
  from public.ingredient_categories ic
  where ic.id = new.category_id;

  if v_category_code is null then
    raise exception 'category id not found' using errcode = 'I0003', hint = 'INGREDIENT_CATEGORY_ID_NOT_FOUND';
  end if;

  new.category := v_category_code;
  return new;
end;
$$;

drop trigger if exists sync_category_reference_columns_on_ingredients on public.ingredients;
create trigger sync_category_reference_columns_on_ingredients
before insert or update of household_id, category, category_id on public.ingredients
for each row execute function public.sync_category_reference_columns();

drop trigger if exists sync_category_reference_columns_on_fridge_items on public.fridge_items;
create trigger sync_category_reference_columns_on_fridge_items
before insert or update of household_id, category, category_id on public.fridge_items
for each row execute function public.sync_category_reference_columns();

create or replace function public.reassign_items_to_other_category_before_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_replacement_category_id uuid;
begin
  if old.code = 'other' then
    raise exception 'other category cannot be deleted'
      using errcode = 'I0001', hint = 'INGREDIENT_CATEGORY_OTHER_DELETE_NOT_ALLOWED';
  end if;

  if old.household_id is not null then
    select ic.id
      into v_replacement_category_id
    from public.ingredient_categories ic
    where ic.household_id = old.household_id
      and ic.code = 'other'
    limit 1;
  end if;

  if v_replacement_category_id is null then
    select ic.id
      into v_replacement_category_id
    from public.ingredient_categories ic
    where ic.household_id is null
      and ic.code = 'other'
    limit 1;
  end if;

  if v_replacement_category_id is null then
    raise exception 'replacement other category not found'
      using errcode = 'I0004', hint = 'INGREDIENT_CATEGORY_REPLACEMENT_NOT_FOUND';
  end if;

  update public.ingredients
  set category_id = v_replacement_category_id
  where category_id = old.id;

  update public.fridge_items
  set category_id = v_replacement_category_id
  where category_id = old.id;

  return old;
end;
$$;

drop trigger if exists reassign_items_to_other_category_before_delete on public.ingredient_categories;
create trigger reassign_items_to_other_category_before_delete
before delete on public.ingredient_categories
for each row execute function public.reassign_items_to_other_category_before_delete();
