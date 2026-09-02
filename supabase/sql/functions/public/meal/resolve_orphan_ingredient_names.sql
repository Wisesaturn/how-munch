-- Function: public.resolve_orphan_ingredient_names
-- Source: supabase/migrations/079_resolve_orphan_ingredient_names.sql
-- 역할: 소프트 삭제되어 조인에서 보이지 않는 냉장고 품목의 표시용 정보를 해석합니다.
-- 동작:
-- 1. fridge_select RLS가 deleted_at is null로 막고 있어, 삭제된 품목을 참조하는 식단 재료는
--    조인 결과가 null이 되어 화면에 빈 값으로 나타납니다.
-- 2. 이 함수는 security definer로 그 벽을 필요한 지점에서만 우회해 이름/단위/카테고리를 돌려줍니다.
-- 3. 호출자가 구성원인 가구의 품목만 반환하므로 다른 가구의 데이터는 노출되지 않습니다.
-- 4. 식단 조회에서 조인이 비어 있는 행에 한해 호출하는 용도이며,
--    재료 선택 목록처럼 삭제 품목이 다시 나타나면 안 되는 곳에서는 사용하지 않습니다.
create or replace function public.resolve_orphan_ingredient_names(p_fridge_item_ids uuid[])
returns table (
  id uuid,
  name text,
  unit text,
  category_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select f.id, f.name, f.unit, f.category_id
  from public.fridge_items f
  where f.id = any(p_fridge_item_ids)
    and public.is_household_member(f.household_id);
$$;
