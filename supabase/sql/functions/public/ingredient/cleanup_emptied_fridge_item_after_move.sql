-- Function: public.cleanup_emptied_fridge_item_after_move
-- Source: supabase/migrations/077_rename_grocery_item_in_place_when_exclusive.sql
-- 역할: 배치가 모두 빠져나가 비게 된 옛 냉장고 품목을 정리합니다.
-- 동작:
-- 1. 이전 품목이 없거나 목표 품목과 같으면 아무것도 하지 않습니다.
-- 2. 이전 품목에 활성 배치가 남아 있으면 정리하지 않습니다.
-- 3. batch_id가 NULL인 과거 행을 포함해 식단 재료 참조를 목표 품목으로 재연결한 뒤,
--    장보기 링크를 끊고 이전 품목을 소프트 삭제합니다.
create or replace function public.cleanup_emptied_fridge_item_after_move(
  p_previous_fridge_item_id uuid,
  p_target_fridge_item_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_previous_fridge_item_id is null
    or p_previous_fridge_item_id is not distinct from p_target_fridge_item_id then
    return;
  end if;

  if exists (
    select 1
    from public.fridge_item_batches b
    where b.fridge_item_id = p_previous_fridge_item_id
      and b.deleted_at is null
  ) then
    return;
  end if;

  -- batch_id가 NULL이라 배치 이동 트리거로는 따라올 수 없는 과거 식단 행까지 일괄 재연결한다.
  -- 이 재연결이 없으면 소프트 삭제된 품목을 가리키는 행이 남아 식단에서 빈 값으로 보인다.
  update public.dish_ingredients
  set fridge_item_id = p_target_fridge_item_id
  where fridge_item_id = p_previous_fridge_item_id;

  update public.ingredients
  set linked_fridge_item_id = null,
      linked_fridge_batch_id = null,
      updated_at = now()
  where linked_fridge_item_id = p_previous_fridge_item_id;

  update public.fridge_items
  set deleted_at = now(),
      updated_at = now()
  where id = p_previous_fridge_item_id
    and deleted_at is null;
end;
$$;
