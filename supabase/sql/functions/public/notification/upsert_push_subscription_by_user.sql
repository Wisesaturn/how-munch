-- Function: public.upsert_push_subscription_by_user
-- Source: supabase/migrations/051_add_upsert_push_subscription_by_user_rpc.sql
-- 역할: 푸시 토큰(endpoint)이 변경되었을 때 기존 구독을 비활성화하고
--       새 구독을 활성화하여 최신 토큰이 항상 반영되도록 보장합니다.
-- 동작:
-- 1. 해당 user_id의 기존 활성 구독 중 endpoint가 다른 것을 모두 비활성화합니다.
-- 2. 새 endpoint로 구독을 upsert합니다(endpoint 충돌 시 최신 키로 업데이트).
create or replace function public.upsert_push_subscription_by_user(
  p_user_id uuid,
  p_endpoint text,
  p_p256dh text,
  p_auth text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 해당 유저의 기존 활성 구독 중 endpoint가 다른 것은 모두 비활성화
  update public.notification_push_subscriptions
  set is_active = false,
      updated_at = now()
  where user_id = p_user_id
    and endpoint <> p_endpoint
    and is_active = true;

  -- 새 endpoint로 구독 upsert (endpoint 충돌 시 최신 키 및 활성 상태로 업데이트)
  insert into public.notification_push_subscriptions (
    user_id,
    endpoint,
    p256dh,
    auth,
    is_active,
    updated_at
  )
  values (
    p_user_id,
    p_endpoint,
    p_p256dh,
    p_auth,
    true,
    now()
  )
  on conflict (endpoint) do update
    set user_id    = excluded.user_id,
        p256dh     = excluded.p256dh,
        auth       = excluded.auth,
        is_active  = true,
        updated_at = now();
end;
$$;
