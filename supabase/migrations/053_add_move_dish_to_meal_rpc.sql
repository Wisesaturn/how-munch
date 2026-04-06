-- ============================================================
-- Add move_dish_to_meal RPC
-- ============================================================
-- 역할: dish를 현재 끼니(meal)에서 다른 끼니 타입으로 이동한다.
-- 동작:
-- 1. p_dish_id로 현재 dish와 소속 meal을 조회한다.
-- 2. p_household_id + p_date + p_target_meal_type으로 대상 meal을 조회한다.
--    없으면 새로 생성한다.
-- 3. dish의 meal_id를 대상 meal id로 업데이트한다.
-- 4. 소스 meal에 dish가 하나도 남지 않으면 소스 meal을 삭제한다.

create or replace function public.move_dish_to_meal(
  p_dish_id      uuid,
  p_target_meal_type text,
  p_household_id uuid,
  p_date         date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_meal_id  uuid;
  v_target_meal_id  uuid;
  v_remaining_count integer;
begin
  -- 1. 현재 dish의 meal_id 조회
  select meal_id
    into v_source_meal_id
    from public.dishes
   where id = p_dish_id;

  if v_source_meal_id is null then
    raise exception 'dish not found: %', p_dish_id
      using errcode = 'X0003', hint = 'MEAL_DISH_NOT_FOUND';
  end if;

  -- 2. 대상 meal 조회 또는 생성
  select id
    into v_target_meal_id
    from public.meals
   where household_id = p_household_id
     and date = p_date
     and type = p_target_meal_type;

  if v_target_meal_id is null then
    insert into public.meals (household_id, date, type)
    values (p_household_id, p_date, p_target_meal_type)
    returning id into v_target_meal_id;
  end if;

  -- 3. dish의 meal_id를 대상 meal로 업데이트
  update public.dishes
     set meal_id    = v_target_meal_id,
         updated_at = now()
   where id = p_dish_id;

  -- 4. 소스 meal에 남은 dish 수 확인 후 빈 meal 삭제
  select count(*)
    into v_remaining_count
    from public.dishes
   where meal_id = v_source_meal_id;

  if v_remaining_count = 0 then
    delete from public.meals where id = v_source_meal_id;
  end if;
end;
$$;
