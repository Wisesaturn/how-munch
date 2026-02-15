-- ============================================================
-- Track fridge max stock and keep it synced with replenishment
-- ============================================================

alter table public.fridge_items
  add column if not exists max_count numeric not null default 0;

update public.fridge_items
set max_count = greatest(coalesce(max_count, 0), coalesce(total_count, 0)),
  updated_at = now();

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
    max_count = greatest(
      coalesce(f.max_count, 0),
      coalesce((
        select sum(b.quantity)
        from public.fridge_item_batches b
        where b.fridge_item_id = p_fridge_item_id
      ), 0)
    ),
    updated_at = now()
  where f.id = p_fridge_item_id;
$$;

grant execute on function public.refresh_fridge_item_total_count(uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');
