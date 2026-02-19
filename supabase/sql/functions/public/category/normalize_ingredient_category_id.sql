-- Function: public.normalize_ingredient_category_id
-- Source: supabase/migrations/038_drop_legacy_category_columns_and_use_category_id.sql
-- 역할: 입력 category_id를 household 기준 유효한 값으로 정규화합니다.
-- 동작:
-- 1. null/invalid 입력을 기본 기타 카테고리로 보정합니다.
-- 2. 유효한 category_id를 반환하여 RPC 내부에서 공통 사용합니다.
create or replace function public.normalize_ingredient_category_id(
  p_household_id uuid,
  p_category_id uuid default null
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_category_id uuid;
begin
  if p_category_id is null then
    return public.resolve_ingredient_category_id(p_household_id, null);
  end if;

  select ic.id
    into v_category_id
  from public.ingredient_categories ic
  where ic.id = p_category_id
    and (ic.household_id is null or ic.household_id = p_household_id)
  limit 1;

  if v_category_id is null then
    raise exception using
      errcode = 'I0003',
      message = '유효하지 않은 카테고리입니다.',
      hint = 'INGREDIENT_CATEGORY_ID_NOT_FOUND';
  end if;

  return v_category_id;
end;
$$;
