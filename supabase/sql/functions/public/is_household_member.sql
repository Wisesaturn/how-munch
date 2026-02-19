-- Function: public.is_household_member
-- Source: supabase/migrations/004_initial_service_schema.sql
-- 역할: 현재 인증 사용자가 특정 household 멤버인지 판별합니다.
-- 동작:
-- 1. household_members 존재 여부를 조회합니다.
-- 2. RLS/보호 함수에서 공통 권한 체크로 사용합니다.
create or replace function public.is_household_member(h_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.household_members
    where household_id = h_id and user_id = auth.uid()
  );
$$ language sql security definer stable;
