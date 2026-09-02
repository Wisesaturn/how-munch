-- Migration: 073_backfill_dish_ingredients_batch_id
-- 역할: 072 이전에 생성되어 batch_id가 비어 있는 dish_ingredients 행에 배치 참조를 복구합니다.
-- 동작:
-- 1. meal_batch_usages 기준으로 (식단, 품목) 후보 배치가 정확히 1건인 행을 그 배치로 확정합니다.
-- 2. 1에서 확정되지 않은 행 중, 해당 품목의 배치가 정확히 1건인 경우 그 배치로 확정합니다.
-- 3. 두 방법으로도 확정할 수 없는 행은 NULL로 남깁니다.
--    072 이전 차감은 FIFO로 여러 배치에 걸칠 수 있어(071 참고) 단일 batch_id로 표현할 수 없으므로,
--    배치를 임의 배정하지 않습니다. 임의 배정은 식단 삭제 시 잘못된 수량 복구로 이어집니다.

do $$
declare
  v_before integer;
  v_after_ledger integer;
  v_after_single integer;
begin
  select count(*) into v_before
  from public.dish_ingredients
  where batch_id is null;

  -- 1) 원장(meal_batch_usages) 기준 확정
  update public.dish_ingredients di
  set batch_id = (
    select mbu.batch_id
    from public.dishes d
    join public.meal_batch_usages mbu
      on mbu.meal_id = d.meal_id
     and mbu.fridge_item_id = di.fridge_item_id
    where d.id = di.dish_id
    group by mbu.batch_id
  )
  where di.batch_id is null
    and (
      select count(distinct mbu.batch_id)
      from public.dishes d
      join public.meal_batch_usages mbu
        on mbu.meal_id = d.meal_id
       and mbu.fridge_item_id = di.fridge_item_id
      where d.id = di.dish_id
    ) = 1;

  select count(*) into v_after_ledger
  from public.dish_ingredients
  where batch_id is null;

  -- 2) 품목의 배치가 유일한 경우 확정
  update public.dish_ingredients di
  set batch_id = (
    select b.id
    from public.fridge_item_batches b
    where b.fridge_item_id = di.fridge_item_id
  )
  where di.batch_id is null
    and (
      select count(*)
      from public.fridge_item_batches b
      where b.fridge_item_id = di.fridge_item_id
    ) = 1;

  select count(*) into v_after_single
  from public.dish_ingredients
  where batch_id is null;

  raise notice 'batch_id 백필: 대상 % / 원장 확정 % / 유일배치 확정 % / 미확정 %',
    v_before,
    v_before - v_after_ledger,
    v_after_ledger - v_after_single,
    v_after_single;
end;
$$;

select pg_notify('pgrst', 'reload schema');
