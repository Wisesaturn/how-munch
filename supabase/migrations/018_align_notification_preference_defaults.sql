-- ============================================================
-- Align notification preference options to app UI presets
-- - today: [1]
-- - this_week: [7,6,5,4,3,2,1]
-- ============================================================

alter table public.notification_preferences
  alter column expiry_remind_days set default array[7, 6, 5, 4, 3, 2, 1];

update public.notification_preferences
set expiry_remind_days = array[7, 6, 5, 4, 3, 2, 1]
where expiry_remind_days = array[3, 1, 0];

select pg_notify('pgrst', 'reload schema');
