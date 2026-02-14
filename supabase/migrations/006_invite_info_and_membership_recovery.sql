-- ============================================================
-- Invite info RPC + membership recovery
-- ============================================================

-- 가구 생성 정책이 이전 환경에서 다르게 남아 있는 경우를 복구
drop policy if exists "household_insert" on public.households;
create policy "household_insert"
  on public.households for insert
  with check (true);

-- profiles.household_id가 존재하지만 household_members가 누락된 상태를 자동 복구
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

revoke all on function public.ensure_current_user_household_member() from public;
grant execute on function public.ensure_current_user_household_member() to authenticated;

-- 초대 코드로 가구명을 조회할 때 household RLS를 우회할 수 있는 읽기 전용 RPC
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

revoke all on function public.get_invite_household(text) from public;
grant execute on function public.get_invite_household(text) to authenticated;
