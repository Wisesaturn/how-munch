-- 역할: 배치가 다른 냉장고 품목으로 이동하면 그 배치를 참조하는 식단 재료의 품목 참조를 따라가게 합니다.
-- 동작:
-- 1. fridge_item_batches.fridge_item_id가 실제로 바뀐 경우에만 실행됩니다(트리거 WHEN 절).
-- 2. 해당 배치를 참조하는 dish_ingredients.fridge_item_id를 새 품목으로 갱신합니다.
-- 3. 이름 변경이 품목 병합/분리로 처리되더라도 식단이 항상 현재 품목(=현재 이름)을 가리키게 만듭니다.
--    batch_id가 NULL인 과거 행은 이 트리거로 따라올 수 없으므로,
--    품목 소프트 삭제 경로에서 별도의 일괄 재연결을 함께 유지해야 합니다.
create or replace function public.sync_dish_ingredients_from_batch_move()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dish_ingredients
  set fridge_item_id = new.fridge_item_id
  where batch_id = new.id
    and fridge_item_id is distinct from new.fridge_item_id;

  return null;
end;
$$;
