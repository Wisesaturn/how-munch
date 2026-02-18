-- Complete category reference transition: make category_id authoritative and keep legacy code in sync.

create or replace function public.sync_category_reference_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category_code text;
begin
  if tg_op = 'INSERT' then
    if new.category_id is null then
      new.category_id := public.resolve_ingredient_category_id(new.household_id, new.category);
    end if;
  else
    if new.category_id is distinct from old.category_id then
      if new.category_id is null then
        new.category_id := public.resolve_ingredient_category_id(new.household_id, new.category);
      end if;
    elsif new.category is distinct from old.category then
      new.category_id := public.resolve_ingredient_category_id(new.household_id, new.category);
    elsif new.category_id is null then
      new.category_id := public.resolve_ingredient_category_id(new.household_id, new.category);
    end if;
  end if;

  select ic.code
    into v_category_code
  from public.ingredient_categories ic
  where ic.id = new.category_id;

  if v_category_code is null then
    raise exception 'category id not found'
      using errcode = 'I0003', hint = 'INGREDIENT_CATEGORY_ID_NOT_FOUND';
  end if;

  new.category := v_category_code;
  return new;
end;
$$;

create or replace function public.sync_items_category_code_after_category_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.code is not distinct from old.code then
    return new;
  end if;

  update public.ingredients
  set category = new.code
  where category_id = new.id
    and category is distinct from new.code;

  update public.fridge_items
  set category = new.code
  where category_id = new.id
    and category is distinct from new.code;

  return new;
end;
$$;

drop trigger if exists sync_items_category_code_after_category_update on public.ingredient_categories;
create trigger sync_items_category_code_after_category_update
after update of code on public.ingredient_categories
for each row execute function public.sync_items_category_code_after_category_update();
