-- Function: public.get_invite_household
-- Source: supabase/migrations/006_invite_info_and_membership_recovery.sql
-- 역할: 초대 코드에 연결된 household 공개 정보를 조회합니다.
-- 동작:
-- 1. invite 코드 기준으로 household를 조인 조회합니다.
-- 2. 유효 여부와 함께 미리보기 용 데이터를 반환합니다.
create or replace function public.get_invite_household(invite_code text)
returns table(
  household_id uuid,
  household_name text,
  expires_at timestamptz,
  max_uses integer,
  use_count integer,
  is_valid boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    i.household_id,
    h.name as household_name,
    i.expires_at,
    i.max_uses,
    i.use_count,
    (i.expires_at > now() and i.use_count < i.max_uses) as is_valid
  from public.household_invites i
  join public.households h on h.id = i.household_id
  where i.code = upper(trim(invite_code))
  limit 1;
end;
$$;
