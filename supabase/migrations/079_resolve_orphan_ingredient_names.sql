-- Migration: 079_resolve_orphan_ingredient_names
-- 역할: 소프트 삭제된 냉장고 품목을 참조하는 식단 재료가 빈 값으로 보이지 않도록 이름 해석 함수를 추가합니다.
-- 동작:
-- 1. resolve_orphan_ingredient_names를 security definer로 추가합니다.
-- 2. 호출자가 구성원인 가구의 품목만 반환해 RLS 우회 범위를 최소화합니다.
-- 3. 식단 조회 API가 조인 결과가 비어 있는 행에 한해 호출합니다.

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

revoke all on function public.resolve_orphan_ingredient_names(uuid[]) from public;
grant execute on function public.resolve_orphan_ingredient_names(uuid[]) to authenticated;

select pg_notify('pgrst', 'reload schema');
