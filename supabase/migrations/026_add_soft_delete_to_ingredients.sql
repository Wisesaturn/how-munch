-- Add soft-delete support for ingredients (grocery ledger).

alter table public.ingredients
  add column if not exists deleted_at timestamptz;

create index if not exists idx_ingredients_household_date_deleted_at
  on public.ingredients(household_id, date, deleted_at);

drop policy if exists "ingredients_select" on public.ingredients;
create policy "ingredients_select" on public.ingredients for select
  using (public.is_household_member(household_id) and deleted_at is null);

select pg_notify('pgrst', 'reload schema');
