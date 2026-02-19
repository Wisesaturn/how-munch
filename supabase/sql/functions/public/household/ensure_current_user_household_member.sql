-- Function: public.ensure_current_user_household_member
-- Source: supabase/migrations/006_invite_info_and_membership_recovery.sql
-- 역할: 현재 사용자의 household 멤버십을 보정합니다.
-- 동작:
-- 1. profiles.household_id를 기준으로 membership 유무를 점검합니다.
-- 2. 누락된 경우 household_members에 멤버 레코드를 보정 생성합니다.
create or replace function public.ensure_current_user_household_member()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_household_id uuid;
begin
  if v_user_id is null then
    return null;
  end if;

  select p.household_id
    into v_household_id
    from public.profiles p
   where p.user_id = v_user_id
   limit 1;

  if v_household_id is null then
    return null;
  end if;

  begin
    insert into public.household_members (household_id, user_id, role)
    values (v_household_id, v_user_id, 'member')
    on conflict (household_id, user_id) do nothing;
  exception
    when foreign_key_violation then
      return null;
  end;

  return v_household_id;
end;
$$;
