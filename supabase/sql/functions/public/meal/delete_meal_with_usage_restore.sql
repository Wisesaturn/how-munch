-- Function: public.delete_meal_with_usage_restore
-- Source: supabase/migrations/032_add_transactional_app_rpcs.sql
-- 역할: 식단 삭제 시 차감됐던 배치 사용량을 복원합니다.
-- 동작:
-- 1. meal_batch_usages를 순회하며 batch quantity를 되돌립니다.
-- 2. 복원 후 meal 레코드를 삭제합니다.
create or replace function public.delete_meal_with_usage_restore(p_meal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_usage record;
begin
  select household_id
    into v_household_id
  from public.meals
  where id = p_meal_id
  for update;

  if v_household_id is null then
    raise exception using
      errcode = 'M0002',
      message = '식단을 찾을 수 없습니다.',
      hint = 'MEAL_NOT_FOUND';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  for v_usage in
    select batch_id, amount
    from public.meal_batch_usages
    where meal_id = p_meal_id
  loop
    update public.fridge_item_batches
    set quantity = quantity + v_usage.amount,
        updated_at = now()
    where id = v_usage.batch_id
      and deleted_at is null;
  end loop;

  delete from public.meals
  where id = p_meal_id;
end;
$$;
