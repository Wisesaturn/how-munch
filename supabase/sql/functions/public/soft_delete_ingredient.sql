-- Function: public.soft_delete_ingredient
-- Source: supabase/migrations/031_guard_fridge_soft_delete_when_used_in_meal.sql
-- 역할: 장보기 항목을 소프트 삭제합니다.
-- 동작:
-- 1. 권한/대상 존재를 검증합니다.
-- 2. deleted_at을 설정해 논리 삭제합니다.
create or replace function public.soft_delete_ingredient(p_ingredient_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_linked_fridge_item_id uuid;
  v_linked_fridge_batch_id uuid;
  v_is_used_in_meal boolean := false;
begin
  select household_id, linked_fridge_item_id, linked_fridge_batch_id
    into v_household_id, v_linked_fridge_item_id, v_linked_fridge_batch_id
  from public.ingredients
  where id = p_ingredient_id
    and deleted_at is null;

  if v_household_id is null then
    raise exception 'ingredient not found';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception 'permission denied';
  end if;

  if v_linked_fridge_batch_id is not null then
    select exists (
      select 1 from public.meal_batch_usages mbu where mbu.batch_id = v_linked_fridge_batch_id
    )
    into v_is_used_in_meal;
  elsif v_linked_fridge_item_id is not null then
    select exists (
      select 1 from public.meal_batch_usages mbu where mbu.fridge_item_id = v_linked_fridge_item_id
    )
    into v_is_used_in_meal;
  end if;

  if v_is_used_in_meal then
    raise exception using
      errcode = 'C0001',
      message = '식단에 등록되어 있는 재료는 삭제할 수 없습니다.',
      hint = 'GROCERY_IN_USE_IN_MEAL';
  end if;

  update public.ingredients
  set deleted_at = now(),
      updated_at = now()
  where id = p_ingredient_id
    and deleted_at is null;
end;
$$;
