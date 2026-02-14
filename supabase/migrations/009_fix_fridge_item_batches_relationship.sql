-- ============================================================
-- Fix fridge_item_batches relationship and policies
-- ============================================================

create table if not exists public.fridge_item_batches (
  id uuid primary key default gen_random_uuid(),
  fridge_item_id uuid not null references public.fridge_items(id) on delete cascade,
  quantity numeric not null default 0,
  expiry_date date,
  purchased_date date not null default current_date,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fridge_item_batches
  add column if not exists fridge_item_id uuid,
  add column if not exists quantity numeric not null default 0,
  add column if not exists expiry_date date,
  add column if not exists purchased_date date not null default current_date,
  add column if not exists memo text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- orphan row 정리 후 FK 재정의
delete from public.fridge_item_batches b
where not exists (
  select 1 from public.fridge_items f where f.id = b.fridge_item_id
);

alter table public.fridge_item_batches
  alter column fridge_item_id set not null;

alter table public.fridge_item_batches
  drop constraint if exists fridge_item_batches_fridge_item_id_fkey;

alter table public.fridge_item_batches
  add constraint fridge_item_batches_fridge_item_id_fkey
  foreign key (fridge_item_id)
  references public.fridge_items(id)
  on delete cascade;

create index if not exists idx_fridge_item_batches_item
  on public.fridge_item_batches(fridge_item_id);
create index if not exists idx_fridge_item_batches_expiry
  on public.fridge_item_batches(expiry_date);

drop trigger if exists set_updated_at on public.fridge_item_batches;
create trigger set_updated_at before update on public.fridge_item_batches
  for each row execute function public.handle_updated_at();

alter table public.fridge_item_batches enable row level security;

drop policy if exists "f_batch_select" on public.fridge_item_batches;
create policy "f_batch_select"
  on public.fridge_item_batches for select
  using (
    exists (
      select 1
      from public.fridge_items f
      where f.id = fridge_item_id
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
        and public.is_household_member(f.household_id)
    )
  );

drop policy if exists "f_batch_update" on public.fridge_item_batches;
create policy "f_batch_update"
  on public.fridge_item_batches for update
  using (
    exists (
      select 1
      from public.fridge_items f
      where f.id = fridge_item_id
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

drop policy if exists "f_batch_delete" on public.fridge_item_batches;
create policy "f_batch_delete"
  on public.fridge_item_batches for delete
  using (
    exists (
      select 1
      from public.fridge_items f
      where f.id = fridge_item_id
        and public.is_household_member(f.household_id)
    )
  );

select pg_notify('pgrst', 'reload schema');
