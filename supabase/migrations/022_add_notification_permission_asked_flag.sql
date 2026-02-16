-- ============================================================
-- Track whether push permission prompt has been asked per user
-- ============================================================

alter table public.notification_preferences
  add column if not exists is_permission_asked boolean not null default false;

select pg_notify('pgrst', 'reload schema');
