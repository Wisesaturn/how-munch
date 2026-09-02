-- Function: public.generate_default_search_synonyms
-- Source: supabase/migrations/082_add_search_synonym_terms.sql
-- 역할: 가구의 검색 동의어를 기본 시드 상태로 재생성합니다.
-- 동작:
-- 1. 해당 가구의 기존 동의어 단어를 모두 삭제합니다(직접 추가한 별칭 포함).
-- 2. 기본 시드 그룹을 그룹마다 새 group_key와 함께 삽입합니다.
-- 3. 삽입된 단어 수를 반환합니다.
-- 비고: 가구 생성 직후에는 삭제가 no-op이므로 최초 시드 주입에도 동일하게 사용합니다.
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
