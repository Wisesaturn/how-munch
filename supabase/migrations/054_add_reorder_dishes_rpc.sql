-- ============================================================
-- Add reorder_dishes RPC
-- ============================================================
-- 역할: 끼니(meal) 내 dish 목록의 sort_order를 배치로 업데이트한다.
-- 동작:
-- 1. p_updates 배열의 각 항목 { dish_id, sort_order }로 dishes 테이블을 갱신한다.
-- 2. 모든 dish가 동일한 household 소유인지 검증한다.
-- 3. 단일 트랜잭션으로 처리한다.

create or replace function public.reorder_dishes(
  p_household_id uuid,
  p_updates      jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item        jsonb;
  v_dish_id     uuid;
  v_sort_order  integer;
  v_meal_household_id uuid;
begin
  -- 각 업데이트 항목 처리
  for v_item in select * from jsonb_array_elements(p_updates)
  loop
    v_dish_id    := (v_item->>'dish_id')::uuid;
    v_sort_order := (v_item->>'sort_order')::integer;

    -- household 소유 검증
    select m.household_id
      into v_meal_household_id
      from public.dishes d
      join public.meals m on m.id = d.meal_id
     where d.id = v_dish_id;

    if v_meal_household_id is null then
      raise exception 'dish not found: %', v_dish_id
        using errcode = 'X0003', hint = 'MEAL_DISH_NOT_FOUND';
    end if;

    if v_meal_household_id <> p_household_id then
      raise exception 'permission denied for dish: %', v_dish_id
        using errcode = 'A0002', hint = 'COMMON_PERMISSION_DENIED';
    end if;

    -- sort_order 업데이트
    update public.dishes
       set sort_order = v_sort_order,
           updated_at = now()
     where id = v_dish_id;
  end loop;
end;
$$;
