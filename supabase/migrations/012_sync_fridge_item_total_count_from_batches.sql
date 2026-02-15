-- ============================================================
-- Sync fridge_items.total_count from fridge_item_batches changes
-- ============================================================

create or replace function public.refresh_fridge_item_total_count(p_fridge_item_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.fridge_items f
  set total_count = coalesce((
      select sum(b.quantity)
      from public.fridge_item_batches b
      where b.fridge_item_id = p_fridge_item_id
    ), 0),
    updated_at = now()
  where f.id = p_fridge_item_id;
$$;

create or replace function public.sync_fridge_item_total_count_from_batches()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_fridge_item_total_count(new.fridge_item_id);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.fridge_item_id is distinct from old.fridge_item_id then
      perform public.refresh_fridge_item_total_count(old.fridge_item_id);
    end if;

    perform public.refresh_fridge_item_total_count(new.fridge_item_id);
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.refresh_fridge_item_total_count(old.fridge_item_id);
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists sync_fridge_item_total_count_on_batch_change on public.fridge_item_batches;
create trigger sync_fridge_item_total_count_on_batch_change
after insert or update or delete on public.fridge_item_batches
for each row execute function public.sync_fridge_item_total_count_from_batches();

-- Backfill once to fix already drifted rows
update public.fridge_items f
set total_count = coalesce(b.total_quantity, 0),
  updated_at = now()
from (
  select fridge_item_id, sum(quantity) as total_quantity
  from public.fridge_item_batches
  group by fridge_item_id
) b
where f.id = b.fridge_item_id;

update public.fridge_items f
set total_count = 0,
  updated_at = now()
where not exists (
  select 1 from public.fridge_item_batches b where b.fridge_item_id = f.id
);

grant execute on function public.refresh_fridge_item_total_count(uuid) to authenticated;
grant execute on function public.sync_fridge_item_total_count_from_batches() to authenticated;

select pg_notify('pgrst', 'reload schema');
