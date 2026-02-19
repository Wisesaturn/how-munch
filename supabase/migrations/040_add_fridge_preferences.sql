-- ============================================================
-- Fridge preferences for per-user app options
-- ============================================================

create table if not exists public.fridge_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  hide_depleted_fridge_items boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.fridge_preferences;
create trigger set_updated_at
  before update on public.fridge_preferences
  for each row execute function public.handle_updated_at();

alter table public.fridge_preferences enable row level security;

drop policy if exists "fridge_preferences_select_own" on public.fridge_preferences;
create policy "fridge_preferences_select_own"
  on public.fridge_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "fridge_preferences_insert_own" on public.fridge_preferences;
create policy "fridge_preferences_insert_own"
  on public.fridge_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "fridge_preferences_update_own" on public.fridge_preferences;
create policy "fridge_preferences_update_own"
  on public.fridge_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "fridge_preferences_delete_own" on public.fridge_preferences;
create policy "fridge_preferences_delete_own"
  on public.fridge_preferences for delete
  using (auth.uid() = user_id);
