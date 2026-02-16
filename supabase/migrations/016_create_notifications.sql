-- ============================================================
-- Notifications (expiry_soon) + user preferences
-- ============================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  type text not null default 'expiry_soon',
  title text not null,
  description text not null,
  payload jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz,
  sent_at timestamptz not null default now(),
  read_at timestamptz,
  status text not null default 'sent' check (status in ('pending', 'sent', 'read', 'canceled')),
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created_at
  on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_user_read_at
  on public.notifications(user_id, read_at);
create index if not exists idx_notifications_household_created_at
  on public.notifications(household_id, created_at desc);
create index if not exists idx_notifications_type_created_at
  on public.notifications(type, created_at desc);

drop trigger if exists set_updated_at on public.notifications;
create trigger set_updated_at
  before update on public.notifications
  for each row execute function public.handle_updated_at();

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
  on public.notifications for delete
  using (user_id = auth.uid());

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  expiry_soon_enabled boolean not null default true,
  expiry_remind_days int[] not null default array[3, 1, 0],
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (coalesce(array_length(expiry_remind_days, 1), 0) > 0)
);

drop trigger if exists set_updated_at on public.notification_preferences;
create trigger set_updated_at
  before update on public.notification_preferences
  for each row execute function public.handle_updated_at();

alter table public.notification_preferences enable row level security;

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own"
  on public.notification_preferences for select
  using (user_id = auth.uid());

drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own"
  on public.notification_preferences for insert
  with check (user_id = auth.uid());

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own"
  on public.notification_preferences for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notification_preferences_delete_own" on public.notification_preferences;
create policy "notification_preferences_delete_own"
  on public.notification_preferences for delete
  using (user_id = auth.uid());

select pg_notify('pgrst', 'reload schema');
