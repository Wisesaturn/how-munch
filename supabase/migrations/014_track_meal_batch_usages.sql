-- ============================================================
-- Track exact fridge batch usage by meal for precise rollback
-- ============================================================

create table if not exists public.meal_batch_usages (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  fridge_item_id uuid not null references public.fridge_items(id) on delete restrict,
  batch_id uuid not null references public.fridge_item_batches(id) on delete restrict,
  amount numeric not null default 0 check (amount > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_meal_batch_usages_meal_id
  on public.meal_batch_usages(meal_id);
create index if not exists idx_meal_batch_usages_batch_id
  on public.meal_batch_usages(batch_id);

alter table public.meal_batch_usages enable row level security;

drop policy if exists "mbu_select" on public.meal_batch_usages;
create policy "mbu_select"
  on public.meal_batch_usages for select
  using (
    exists (
      select 1
      from public.meals m
      where m.id = meal_id
        and public.is_household_member(m.household_id)
    )
  );

drop policy if exists "mbu_insert" on public.meal_batch_usages;
create policy "mbu_insert"
  on public.meal_batch_usages for insert
  with check (
    exists (
      select 1
      from public.meals m
      where m.id = meal_id
        and public.is_household_member(m.household_id)
    )
  );

drop policy if exists "mbu_update" on public.meal_batch_usages;
create policy "mbu_update"
  on public.meal_batch_usages for update
  using (
    exists (
      select 1
      from public.meals m
      where m.id = meal_id
        and public.is_household_member(m.household_id)
    )
  )
  with check (
    exists (
      select 1
      from public.meals m
      where m.id = meal_id
        and public.is_household_member(m.household_id)
    )
  );

drop policy if exists "mbu_delete" on public.meal_batch_usages;
create policy "mbu_delete"
  on public.meal_batch_usages for delete
  using (
    exists (
      select 1
      from public.meals m
      where m.id = meal_id
        and public.is_household_member(m.household_id)
    )
  );

select pg_notify('pgrst', 'reload schema');
