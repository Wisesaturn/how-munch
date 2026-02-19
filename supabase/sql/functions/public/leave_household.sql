-- Function: public.leave_household
-- Source: supabase/migrations/032_add_transactional_app_rpcs.sql
-- 역할: 현재 사용자의 household 탈퇴를 처리합니다.
-- 동작:
-- 1. household_members에서 본인 멤버십을 제거합니다.
-- 2. profiles.household_id를 null로 정리합니다.
create or replace function public.leave_household(p_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  delete from public.household_members
  where household_id = p_household_id
    and user_id = v_user_id;

  update public.profiles
  set household_id = null,
      updated_at = now()
  where user_id = v_user_id
    and household_id = p_household_id;
end;
$$;
