-- 검색 동의어(별칭) 테이블 추가 및 가구별 기본 시드 반영.
-- 식단/냉장고/장보기 검색에서 통용어로도 재고를 찾을 수 있도록 동의어 그룹을 가구 단위로 저장한다.
-- 모든 행은 가구 소유이며, 기본 시드도 가구 생성 시점에 복사해 넣는다(전역 공유 행 없음).

create table if not exists public.search_synonym_terms (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  group_key uuid not null,
  term text not null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint search_synonym_terms_term_not_blank check (length(trim(term)) > 0)
);

-- 한 가구에서 하나의 단어는 하나의 그룹에만 속한다 (대소문자 무시).
create unique index if not exists uq_search_synonym_terms_household_term
  on public.search_synonym_terms(household_id, lower(term));

create index if not exists idx_search_synonym_terms_household_group
  on public.search_synonym_terms(household_id, group_key);

alter table public.search_synonym_terms enable row level security;

create policy "search_synonym_terms_select"
  on public.search_synonym_terms for select
  using (public.is_household_member(household_id));

create policy "search_synonym_terms_insert"
  on public.search_synonym_terms for insert
  with check (public.is_household_member(household_id));

create policy "search_synonym_terms_delete"
  on public.search_synonym_terms for delete
  using (public.is_household_member(household_id));

grant select, insert, delete on public.search_synonym_terms to authenticated;

-- 검색 동의어 시드/등록 함수
create or replace function public.generate_default_search_synonyms(p_household_id uuid)
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

create or replace function public.upsert_search_synonym_guarded(
  p_household_id uuid,
  p_base_term text,
  p_terms text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_terms text[];
  v_added_count integer;
  v_group_keys uuid[];
  v_group_key uuid;
  v_conflict_term text;
begin
  if not public.is_household_member(p_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  -- 기준어 + 입력 단어를 합쳐 trim하고, 빈 값과 대소문자 무시 중복을 제거한다.
  select array_agg(t order by t)
  into v_terms
  from (
    select distinct on (lower(trim(t))) trim(t) as t
    from unnest(array_append(p_terms, p_base_term)) as t
    where length(trim(coalesce(t, ''))) > 0
    order by lower(trim(t)), trim(t)
  ) as deduped;

  -- 기준어를 뺀 실제 입력 단어 수 (빈 값 제외)
  select count(*)
  into v_added_count
  from unnest(coalesce(p_terms, array[]::text[])) as t
  where length(trim(coalesce(t, ''))) > 0;

  if v_added_count = 0 or length(trim(coalesce(p_base_term, ''))) = 0 then
    raise exception using
      errcode = 'R0002',
      message = '연결할 단어를 입력해 주세요.',
      hint = 'SEARCH_SYNONYM_TERM_EMPTY';
  end if;

  if v_terms is null or array_length(v_terms, 1) < 2 then
    raise exception using
      errcode = 'R0003',
      message = '이미 같은 단어입니다. 다른 단어를 입력해 주세요.',
      hint = 'SEARCH_SYNONYM_TERM_DUPLICATED';
  end if;

  -- 입력 단어들이 이미 속한 그룹을 모은다.
  select array_agg(distinct s.group_key)
  into v_group_keys
  from public.search_synonym_terms s
  where s.household_id = p_household_id
    and lower(s.term) = any (select lower(t) from unnest(v_terms) as t);

  if array_length(v_group_keys, 1) > 1 then
    select s.term
    into v_conflict_term
    from public.search_synonym_terms s
    where s.household_id = p_household_id
      and lower(s.term) = any (select lower(t) from unnest(v_terms) as t)
      and lower(s.term) <> lower(trim(p_base_term))
    order by s.created_at
    limit 1;

    raise exception using
      errcode = 'R0001',
      message = format('%s은(는) 이미 다른 단어와 연결되어 있습니다.', coalesce(v_conflict_term, '입력한 단어')),
      hint = 'SEARCH_SYNONYM_GROUP_CONFLICT';
  end if;

  v_group_key := coalesce(v_group_keys[1], gen_random_uuid());

  insert into public.search_synonym_terms (household_id, group_key, term, created_by)
  select p_household_id, v_group_key, t, auth.uid()
  from unnest(v_terms) as t
  where lower(t) not in (
    select lower(s.term)
    from public.search_synonym_terms s
    where s.household_id = p_household_id
  );

  return v_group_key;
end;
$$;

-- create_household_with_owner: 가구 생성 시 기본 검색 동의어를 함께 심는다.
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

grant execute on function public.generate_default_search_synonyms(uuid) to authenticated;
grant execute on function public.upsert_search_synonym_guarded(uuid, text, text[]) to authenticated;

-- 기존 가구 backfill: 이미 동의어가 있는 가구는 건드리지 않는다.
do $$
declare
  v_household_id uuid;
begin
  for v_household_id in
    select h.id
    from public.households h
    where not exists (
      select 1 from public.search_synonym_terms s where s.household_id = h.id
    )
  loop
    perform public.generate_default_search_synonyms(v_household_id);
  end loop;
end;
$$;
