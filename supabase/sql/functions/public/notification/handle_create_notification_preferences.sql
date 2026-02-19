-- Function: public.handle_create_notification_preferences
-- Source: supabase/migrations/017_add_expiry_notification_rpc.sql
-- 역할: 사용자 생성 시 notification_preferences 기본값을 초기화합니다.
-- 동작:
-- 1. 신규 사용자 트리거에서 호출됩니다.
-- 2. 사용자별 알림 설정 기본 행을 upsert/insert 합니다.
create or replace function public.handle_create_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
