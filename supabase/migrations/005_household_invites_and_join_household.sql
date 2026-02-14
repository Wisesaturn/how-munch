-- ============================================================
-- Household invites + join RPC (safe version)
-- ============================================================

create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  max_uses integer not null default 10 check (max_uses > 0),
  use_count integer not null default 0 check (use_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_invites_code on public.household_invites(code);
create index if not exists idx_invites_household on public.household_invites(household_id);

alter table public.household_invites enable row level security;

drop policy if exists "invite_select" on public.household_invites;
create policy "invite_select"
  on public.household_invites for select
  using (public.is_household_member(household_id));

drop policy if exists "invite_insert" on public.household_invites;
create policy "invite_insert"
  on public.household_invites for insert
  with check (public.is_household_member(household_id));

drop policy if exists "invite_delete" on public.household_invites;
create policy "invite_delete"
  on public.household_invites for delete
  using (public.is_household_member(household_id));

-- 요청사항: 초대 코드는 누구나 조회 가능
drop policy if exists "invite_select_by_code" on public.household_invites;
create policy "invite_select_by_code"
  on public.household_invites for select
  using (true);

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
    raise exception 'Unauthorized';
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
    raise exception 'Invalid or expired invite code';
  end if;

  v_household_id := v_invite.household_id;

  if exists (
    select 1
      from public.household_members
     where household_id = v_household_id
       and user_id = v_user_id
  ) then
    raise exception 'Already a member of this household';
  end if;

  -- 슬롯 확보 (max_uses 보장)
  update public.household_invites
     set use_count = use_count + 1
   where id = v_invite.id
     and use_count < max_uses;

  if not found then
    raise exception 'Invite has reached the maximum number of uses';
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

revoke all on function public.join_household(text) from public;
grant execute on function public.join_household(text) to authenticated;
