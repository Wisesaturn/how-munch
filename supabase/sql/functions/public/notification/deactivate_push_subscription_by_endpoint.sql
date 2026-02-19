-- Function: public.deactivate_push_subscription_by_endpoint
-- Source: supabase/migrations/021_add_push_dispatch_rpcs.sql
-- 역할: 문제 endpoint 푸시 구독을 비활성화합니다.
-- 동작:
-- 1. endpoint 일치 레코드를 조회합니다.
-- 2. 활성 플래그/갱신 시각을 업데이트합니다.
create or replace function public.deactivate_push_subscription_by_endpoint(p_endpoint text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_push_subscriptions
  set is_active = false,
      updated_at = now()
  where endpoint = p_endpoint;

  return true;
end;
$$;
