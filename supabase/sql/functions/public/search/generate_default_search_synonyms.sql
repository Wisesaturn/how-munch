-- Function: public.generate_default_search_synonyms
-- Source: supabase/migrations/082_add_search_synonym_terms.sql
-- 역할: 사용자가 자기 가구의 검색 동의어를 기본 시드 상태로 되돌립니다.
-- 동작:
-- 1. 요청 유저가 해당 가구의 구성원인지 확인합니다.
-- 2. seed_search_synonyms를 호출해 기존 별칭을 지우고 기본 시드를 다시 심습니다.
-- 3. 삽입된 단어 수를 반환합니다.
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
