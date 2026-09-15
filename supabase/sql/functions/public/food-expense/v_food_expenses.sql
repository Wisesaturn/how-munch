-- 역할: 장보기(ingredients)와 외식비(dining_expenses)를 하나의 식비 내역으로 노출하는 통합 조회 뷰.
-- 동작:
--   1. ingredients에서 deleted_at is null 행을 kind='grocery' 리터럴과 함께 선택한다.
--   2. dining_expenses에서 deleted_at is null 행을 kind(restaurant|delivery) 그대로 선택한다.
--   3. 두 결과를 UNION ALL로 합친다. 한쪽에만 있는 컬럼은 서로 null로 채워 컬럼 구조를 맞춘다.
--   4. security_invoker = true라 두 원본 테이블의 RLS가 호출자 기준으로 그대로 적용된다.
-- 비고: 새 식비 유형은 테이블을 늘리지 않고 dining_expenses.kind로 흡수한다. UNION은 이 뷰 한 곳에만 존재한다.

create or replace view public.v_food_expenses
with (security_invoker = true)
as
select
  i.id,
  i.household_id,
  i.user_id,
  'grocery'::text as kind,
  i.date,
  i.name,
  i.brand,
  i.store,
  i.price,
  i.category_id,
  i.count,
  i.unit,
  i.linked_fridge_item_id,
  i.linked_fridge_batch_id,
  null::text as memo,
  i.created_at,
  i.updated_at
from public.ingredients i
where i.deleted_at is null
union all
select
  d.id,
  d.household_id,
  d.user_id,
  d.kind,
  d.date,
  d.name,
  d.brand,
  d.store,
  d.price,
  null::uuid as category_id,
  null::numeric as count,
  null::text as unit,
  null::uuid as linked_fridge_item_id,
  null::uuid as linked_fridge_batch_id,
  d.memo,
  d.created_at,
  d.updated_at
from public.dining_expenses d
where d.deleted_at is null;
