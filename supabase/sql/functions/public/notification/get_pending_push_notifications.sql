-- Function: public.get_pending_push_notifications
-- Source: supabase/migrations/021_add_push_dispatch_rpcs.sql
-- 역할: 푸시 전송 대기 중인 알림 목록을 조회합니다.
-- 동작:
-- 1. 전송 대상/상태 조건으로 후보를 필터링합니다.
-- 2. limit 기반으로 우선순위 순서 데이터를 반환합니다.
create or replace function public.get_pending_push_notifications(p_limit integer default 100)
returns table (
  notification_id uuid,
  user_id uuid,
  title text,
  description text,
  endpoint text,
  p256dh text,
  auth text
)
language sql
security definer
set search_path = public
as $$
  select
    n.id as notification_id,
    n.user_id,
    n.title,
    n.description,
    s.endpoint,
    s.p256dh,
    s.auth
  from public.notifications n
  join public.notification_push_subscriptions s
    on s.user_id = n.user_id
   and s.is_active = true
  where n.push_sent_at is null
    and n.read_at is null
  order by n.created_at asc
  limit p_limit;
$$;
