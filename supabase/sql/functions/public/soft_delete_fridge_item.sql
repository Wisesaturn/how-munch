-- Function: public.soft_delete_fridge_item
-- Source: supabase/migrations/031_guard_fridge_soft_delete_when_used_in_meal.sql
-- 역할: 냉장고 아이템을 소프트 삭제하며 연관 배치 정리를 수행합니다.
-- 동작:
-- 1. 권한과 식단 사용 여부를 검증합니다.
-- 2. 삭제 시각을 기록하고 연관 배치 정합성을 함께 맞춥니다.
create or replace function public.soft_delete_fridge_item(p_fridge_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_is_used_in_meal boolean := false;
begin
  select household_id
    into v_household_id
  from public.fridge_items
  where id = p_fridge_item_id
    and deleted_at is null;

  if v_household_id is null then
    raise exception 'fridge item not found';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception 'permission denied';
  end if;

  select exists (
    select 1
    from public.meal_batch_usages mbu
    where mbu.fridge_item_id = p_fridge_item_id
  )
  into v_is_used_in_meal;

  if v_is_used_in_meal then
    raise exception using
      errcode = 'F0001',
      message = '식단에 등록되어 있는 재료는 삭제할 수 없습니다.',
      hint = 'FRIDGE_IN_USE_IN_MEAL';
  end if;

  update public.fridge_item_batches
  set deleted_at = now(),
      updated_at = now()
  where fridge_item_id = p_fridge_item_id
    and deleted_at is null;

  update public.ingredients
  set linked_fridge_item_id = null,
      linked_fridge_batch_id = null
  where linked_fridge_item_id = p_fridge_item_id;

  perform public.refresh_fridge_item_total_count(p_fridge_item_id);

  update public.fridge_items
  set deleted_at = now(),
      updated_at = now()
  where id = p_fridge_item_id
    and deleted_at is null;
end;
$$;
