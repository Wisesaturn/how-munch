-- Link grocery ingredient rows to a specific fridge batch
-- and add soft-delete support for fridge_items.

alter table public.ingredients
  add column if not exists linked_fridge_batch_id uuid references public.fridge_item_batches(id) on delete set null;

create index if not exists idx_ingredients_linked_fridge_batch
  on public.ingredients(linked_fridge_batch_id);

-- Backfill: when only item link exists, bind each ingredient to the latest batch of that item.
update public.ingredients i
set linked_fridge_batch_id = candidate.batch_id
from (
  select
    i2.id as ingredient_id,
    (
      select b.id
      from public.fridge_item_batches b
      where b.fridge_item_id = i2.linked_fridge_item_id
      order by b.purchased_date desc, b.created_at desc
      limit 1
    ) as batch_id
  from public.ingredients i2
  where i2.linked_fridge_item_id is not null
    and i2.linked_fridge_batch_id is null
) candidate
where i.id = candidate.ingredient_id
  and candidate.batch_id is not null;

alter table public.fridge_items
  add column if not exists deleted_at timestamptz;

create index if not exists idx_fridge_items_household_deleted_at
  on public.fridge_items(household_id, deleted_at);

drop policy if exists "fridge_select" on public.fridge_items;
create policy "fridge_select" on public.fridge_items for select
  using (public.is_household_member(household_id) and deleted_at is null);

create or replace function public.soft_delete_fridge_item(p_fridge_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  select household_id
    into v_household_id
  from public.fridge_items
  where id = p_fridge_item_id;

  if v_household_id is null then
    raise exception 'fridge item not found';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception 'permission denied';
  end if;

  delete from public.fridge_item_batches
  where fridge_item_id = p_fridge_item_id;

  update public.ingredients
  set linked_fridge_item_id = null,
      linked_fridge_batch_id = null
  where linked_fridge_item_id = p_fridge_item_id;

  update public.fridge_items
  set deleted_at = now(),
      updated_at = now()
  where id = p_fridge_item_id;
end;
$$;

grant execute on function public.soft_delete_fridge_item(uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');
