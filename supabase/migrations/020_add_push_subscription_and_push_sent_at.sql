-- ============================================================
-- Web Push subscriptions + notification push tracking
-- ============================================================

alter table public.notifications
  add column if not exists push_sent_at timestamptz;

create index if not exists idx_notifications_push_sent_at
  on public.notifications(push_sent_at, created_at desc);

create table if not exists public.notification_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notification_push_subscriptions_user
  on public.notification_push_subscriptions(user_id);

drop trigger if exists set_updated_at on public.notification_push_subscriptions;
create trigger set_updated_at
  before update on public.notification_push_subscriptions
  for each row execute function public.handle_updated_at();

alter table public.notification_push_subscriptions enable row level security;

drop policy if exists "nps_select_own" on public.notification_push_subscriptions;
create policy "nps_select_own"
  on public.notification_push_subscriptions for select
  using (user_id = auth.uid());

drop policy if exists "nps_insert_own" on public.notification_push_subscriptions;
create policy "nps_insert_own"
  on public.notification_push_subscriptions for insert
  with check (user_id = auth.uid());

drop policy if exists "nps_update_own" on public.notification_push_subscriptions;
create policy "nps_update_own"
  on public.notification_push_subscriptions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "nps_delete_own" on public.notification_push_subscriptions;
create policy "nps_delete_own"
  on public.notification_push_subscriptions for delete
  using (user_id = auth.uid());

select pg_notify('pgrst', 'reload schema');
