-- Function: public.join_household
-- Source: supabase/migrations/005_household_invites_and_join_household.sql
-- 역할: 초대 코드로 household 가입을 처리합니다.
-- 동작:
-- 1. 초대 코드 유효성과 사용 가능 횟수를 검증합니다.
-- 2. 멤버십 추가, 초대 사용 횟수 증가, profile household 연결을 트랜잭션으로 처리합니다.
create or replace function public.join_household(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.household_invites%rowtype;
  v_household_id uuid;
begin
  if v_user_id is null then
    raise exception using
      errcode = 'A0001',
      message = '로그인이 필요합니다.',
      hint = 'AUTH_UNAUTHORIZED';
  end if;

  -- 유효한 초대코드를 잠그고 조회하여 동시성 경쟁 방지
  select *
    into v_invite
    from public.household_invites
   where code = invite_code
     and expires_at > now()
     and use_count < max_uses
   for update;

  if not found then
    raise exception using
      errcode = 'H0001',
      message = '유효하지 않거나 만료된 초대 코드입니다.',
      hint = 'HOUSEHOLD_INVITE_INVALID_OR_EXPIRED';
  end if;

  v_household_id := v_invite.household_id;

  if exists (
    select 1
      from public.household_members
     where household_id = v_household_id
       and user_id = v_user_id
  ) then
    raise exception using
      errcode = 'H0002',
      message = '이미 해당 가구의 구성원입니다.',
      hint = 'HOUSEHOLD_ALREADY_MEMBER';
  end if;

  -- 슬롯 확보 (max_uses 보장)
  update public.household_invites
     set use_count = use_count + 1
   where id = v_invite.id
     and use_count < max_uses;

  if not found then
    raise exception using
      errcode = 'H0003',
      message = '초대 코드 사용 횟수가 모두 소진되었습니다.',
      hint = 'HOUSEHOLD_INVITE_MAX_USES_REACHED';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (v_household_id, v_user_id, 'member');

  update public.profiles
     set household_id = v_household_id,
         updated_at = now()
   where user_id = v_user_id;

  return v_household_id;
end;
$$;
