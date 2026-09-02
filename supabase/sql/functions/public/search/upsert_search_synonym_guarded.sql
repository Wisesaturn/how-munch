-- Function: public.upsert_search_synonym_guarded
-- Source: supabase/migrations/082_add_search_synonym_terms.sql
-- 역할: 검색어와 사용자가 입력한 단어들을 하나의 동의어 그룹으로 묶습니다.
-- 동작:
-- 1. 입력 단어를 trim/중복 제거하고 빈 값이면 예외를 발생시킵니다.
-- 2. 입력 단어 중 이미 그룹에 속한 것이 둘 이상의 서로 다른 그룹에 걸치면 병합을 거부합니다.
-- 3. 기존 그룹이 하나면 그 그룹에 합류하고, 없으면 새 group_key를 만듭니다.
-- 4. 이미 그룹에 있는 단어는 건너뛰고(멱등), 최종 group_key를 반환합니다.
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
