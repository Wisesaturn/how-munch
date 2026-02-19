-- Function: public.delete_my_account
-- Source: supabase/migrations/011_delete_my_account_rpc.sql
-- 역할: 현재 인증 사용자 계정 관련 데이터를 안전하게 정리합니다.
-- 동작:
-- 1. 본인 uid 기준 연관 데이터 정리/삭제를 수행합니다.
-- 2. 최종적으로 auth 계정 삭제 워크플로우를 완료합니다.
create or replace function public.delete_my_account()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  delete from auth.users where id = v_user_id;

  return found;
end;
$$;
