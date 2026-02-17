-- Add soft-delete support for fridge_item_batches and keep fridge total_count consistent.

alter table public.fridge_item_batches
  add column if not exists deleted_at timestamptz;

create index if not exists idx_fridge_item_batches_item_deleted_at
  on public.fridge_item_batches(fridge_item_id, deleted_at);

-- Active batch only policies
-- (fridge_items soft-delete column is introduced in migration 024)
drop policy if exists "f_batch_select" on public.fridge_item_batches;
create policy "f_batch_select"
  on public.fridge_item_batches for select
  using (
    deleted_at is null
    and exists (
      select 1
      from public.fridge_items f
      where f.id = fridge_item_id
        and f.deleted_at is null
        and public.is_household_member(f.household_id)
    )
  );

drop policy if exists "f_batch_insert" on public.fridge_item_batches;
create policy "f_batch_insert"
  on public.fridge_item_batches for insert
  with check (
    exists (
      select 1
      from public.fridge_items f
      where f.id = fridge_item_id
        and f.deleted_at is null
        and public.is_household_member(f.household_id)
    )
  );

drop policy if exists "f_batch_update" on public.fridge_item_batches;
create policy "f_batch_update"
  on public.fridge_item_batches for update
  using (
    deleted_at is null
    and exists (
      select 1
      from public.fridge_items f
      where f.id = fridge_item_id
        and f.deleted_at is null
        and public.is_household_member(f.household_id)
    )
  )
  with check (
    exists (
      select 1
      from public.fridge_items f
      where f.id = fridge_item_id
        and public.is_household_member(f.household_id)
    )
  );

-- Re-define aggregate sync function to ignore soft-deleted batches.
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
        and b.deleted_at is null
    ), 0),
    updated_at = now()
  where f.id = p_fridge_item_id;
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

grant execute on function public.soft_delete_fridge_batch(uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');
