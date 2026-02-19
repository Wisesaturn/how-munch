-- Function: public.resolve_ingredient_category_id
-- Source: supabase/migrations/036_finalize_category_fk_with_sync.sql
-- 역할: 카테고리 코드 문자열을 카테고리 UUID로 해석합니다.
-- 동작:
-- 1. household 기본/커스텀 카테고리를 조회합니다.
-- 2. 유효한 id를 반환하거나 fallback 정책을 적용합니다.
create or replace function public.resolve_ingredient_category_id(
  p_household_id uuid,
  p_category_code text
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_category_code text;
  v_category_id uuid;
begin
  v_category_code := coalesce(nullif(trim(p_category_code), ''), 'other');

  if p_household_id is not null then
    select ic.id
      into v_category_id
    from public.ingredient_categories ic
    where ic.household_id = p_household_id
      and ic.code = v_category_code
    limit 1;
  end if;

  if v_category_id is null then
    select ic.id
      into v_category_id
    from public.ingredient_categories ic
    where ic.household_id is null
      and ic.code = v_category_code
    limit 1;
  end if;

  if v_category_id is null then
    select ic.id
      into v_category_id
    from public.ingredient_categories ic
    where ic.household_id is null
      and ic.code = 'other'
    limit 1;
  end if;

  if v_category_id is null then
    raise exception 'other category not found' using errcode = 'I0002', hint = 'INGREDIENT_CATEGORY_OTHER_NOT_FOUND';
  end if;

  return v_category_id;
end;
$$;
