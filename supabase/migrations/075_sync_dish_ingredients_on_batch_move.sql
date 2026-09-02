-- Migration: 075_sync_dish_ingredients_on_batch_move
-- 역할: 배치가 다른 품목으로 이동할 때 식단 재료의 품목 참조가 자동으로 따라가도록 트리거를 추가합니다.
-- 동작:
-- 1. sync_dish_ingredients_from_batch_move 트리거 함수를 생성합니다.
-- 2. fridge_item_batches에 AFTER UPDATE 트리거를 걸되,
--    WHEN 절로 fridge_item_id가 실제로 바뀐 경우에만 실행해 일반 수량 갱신에서는 동작하지 않게 합니다.

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

drop trigger if exists sync_dish_ingredients_on_batch_move on public.fridge_item_batches;
create trigger sync_dish_ingredients_on_batch_move
  after update on public.fridge_item_batches
  for each row
  when (old.fridge_item_id is distinct from new.fridge_item_id)
  execute function public.sync_dish_ingredients_from_batch_move();

select pg_notify('pgrst', 'reload schema');
