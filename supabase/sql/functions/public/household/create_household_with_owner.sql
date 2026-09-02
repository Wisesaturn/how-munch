-- Function: public.create_household_with_owner
-- Source: supabase/migrations/032_add_transactional_app_rpcs.sql
-- 역할: household 생성과 owner 멤버 연결을 원자적으로 처리합니다.
-- 동작:
-- 1. household 생성 후 현재 유저를 owner로 등록합니다.
-- 2. profiles.household_id를 새 household로 갱신합니다.
-- 3. 기본 검색 동의어(별칭) 시드를 새 household에 심습니다.
create or replace function public.create_household_with_owner(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_household_id uuid := gen_random_uuid();
begin
  if v_user_id is null then
    raise exception using
      errcode = 'A0001',
      message = '로그인이 필요합니다.',
      hint = 'AUTH_UNAUTHORIZED';
  end if;

  insert into public.households (id, name)
  values (v_household_id, p_name);

  insert into public.household_members (household_id, user_id, role)
  values (v_household_id, v_user_id, 'owner')
  on conflict (household_id, user_id) do update
    set role = excluded.role;

  update public.profiles
  set household_id = v_household_id,
      updated_at = now()
  where user_id = v_user_id;

  perform public.generate_default_search_synonyms(v_household_id);

  return v_household_id;
end;
$$;
