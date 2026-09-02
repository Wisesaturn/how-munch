-- 검색 별칭 RPC의 권한 하드닝과 시드 함수 분리.
-- 배경:
-- 1. generate_default_search_synonyms는 security definer로 가구의 별칭을 전부 삭제하는데
--    멤버십 검사가 없어, authenticated 사용자가 임의 가구의 별칭을 지울 수 있었다.
-- 2. 083에서 get_fridge_items_with_active_batches를 drop하면서 046이 걸어둔
--    revoke(public/anon) 하드닝이 함께 사라졌다.
-- 조치:
-- - 시드 본체를 seed_search_synonyms(내부용, 무가드)로 분리하고,
--   generate_default_search_synonyms는 멤버십을 검사한 뒤 이를 호출하는 공개 진입점으로 바꾼다.
--   (가구 생성 RPC와 마이그레이션 backfill처럼 auth.uid()가 없는 경로는 내부 함수를 직접 쓴다)
-- - 이번에 추가된 함수와 083에서 재생성된 함수에 revoke/grant 짝을 다시 세운다.

create or replace function public.seed_search_synonyms(p_household_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group text[];
  v_group_key uuid;
  v_inserted integer := 0;
begin
  delete from public.search_synonym_terms
  where household_id = p_household_id;

  -- 기본 시드: 같은 물건의 다른 표기(등급·규격 표기 포함)만 묶는다.
  -- 상위어→부위(돼지고기→삼겹살)나 접미어 그룹(기름/유/오일)은 오탐이 커서 제외한다.
  for v_group in
    select g from (values
      (array['계란', '달걀', '대란', '왕란', '특란', '중란']),
      (array['젓갈', '젓']),
      (array['고춧가루', '고추가루']),
      (array['케첩', '케찹', '케챱']),
      (array['요거트', '요구르트', '요플레']),
      (array['초밥', '스시']),
      (array['우유', '밀크']),
      (array['만두', '교자']),
      (array['새우', '쉬림프']),
      (array['감자', '포테이토']),
      (array['삼겹살', '오겹살'])
    ) as seed(g)
  loop
    v_group_key := gen_random_uuid();

    insert into public.search_synonym_terms (household_id, group_key, term)
    select p_household_id, v_group_key, t
    from unnest(v_group) as t;

    v_inserted := v_inserted + array_length(v_group, 1);
  end loop;

  return v_inserted;
end;
$$;

create or replace function public.generate_default_search_synonyms(p_household_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  -- security definer + 전체 삭제이므로, 멤버십 검사가 없으면 임의 가구의 별칭을 지울 수 있다.
  if not public.is_household_member(p_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  return public.seed_search_synonyms(p_household_id);
end;
$$;

-- create_household_with_owner: 가구 생성 직후 경로는 내부 시드 함수를 직접 호출한다.
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

  perform public.seed_search_synonyms(v_household_id);

  return v_household_id;
end;
$$;

-- 권한: 내부 시드 함수는 사용자에게 노출하지 않는다.
revoke all on function public.seed_search_synonyms(uuid) from public;
revoke all on function public.seed_search_synonyms(uuid) from anon;
revoke all on function public.seed_search_synonyms(uuid) from authenticated;
grant execute on function public.seed_search_synonyms(uuid) to service_role;

revoke all on function public.generate_default_search_synonyms(uuid) from public;
revoke all on function public.generate_default_search_synonyms(uuid) from anon;
grant execute on function public.generate_default_search_synonyms(uuid) to authenticated;
grant execute on function public.generate_default_search_synonyms(uuid) to service_role;

revoke all on function public.upsert_search_synonym_guarded(uuid, text, text[]) from public;
revoke all on function public.upsert_search_synonym_guarded(uuid, text, text[]) from anon;
grant execute on function public.upsert_search_synonym_guarded(uuid, text, text[]) to authenticated;
grant execute on function public.upsert_search_synonym_guarded(uuid, text, text[]) to service_role;

-- 083의 drop으로 유실된 046의 하드닝을 새 시그니처 기준으로 복구한다.
revoke all on function public.get_fridge_items_with_active_batches(uuid, text[]) from public;
revoke all on function public.get_fridge_items_with_active_batches(uuid, text[]) from anon;
grant execute on function public.get_fridge_items_with_active_batches(uuid, text[]) to authenticated;
grant execute on function public.get_fridge_items_with_active_batches(uuid, text[]) to service_role;
