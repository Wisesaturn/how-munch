-- Function: public.mark_notifications_push_sent
-- Source: supabase/migrations/021_add_push_dispatch_rpcs.sql
-- 역할: 푸시 전송 완료된 알림의 push_sent_at 상태를 마킹합니다.
-- 동작:
-- 1. 입력된 notification id 배열을 대상으로 업데이트합니다.
-- 2. 중복 마킹을 피하면서 sent 상태만 갱신합니다.
create or replace function public.mark_notifications_push_sent(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
begin
  if p_ids is null or coalesce(array_length(p_ids, 1), 0) = 0 then
    return 0;
  end if;

  update public.notifications
  set push_sent_at = now(),
      updated_at = now()
  where id = any (p_ids)
    and push_sent_at is null;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;
