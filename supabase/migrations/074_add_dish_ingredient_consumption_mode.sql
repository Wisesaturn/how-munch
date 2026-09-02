-- Migration: 074_add_dish_ingredient_consumption_mode
-- 역할: dish_ingredients의 "개수 사용량 기록"과 "사용/소진 토글"을 판별자 컬럼으로 명시하고 제약으로 강제합니다.
-- 동작:
-- 1. consumption_mode 컬럼을 추가하고 참조 품목의 unit으로 백필합니다('count' → quantity, 그 외 → toggle).
-- 2. toggle 행에 남아 있는 amount를 NULL로 정리합니다.
--    실제 차감량은 meal_batch_usages가 계속 보관하므로 정보 손실은 없습니다.
-- 3. consumption_mode를 NOT NULL로 승격하고 태그드 유니온 CHECK 제약을 겁니다.
-- 4. BEFORE INSERT/UPDATE 트리거로 consumption_mode를 항상 단위로부터 파생시킵니다.

-- Step 1: 컬럼 추가 + 백필
ALTER TABLE public.dish_ingredients
  ADD COLUMN IF NOT EXISTS consumption_mode text;

UPDATE public.dish_ingredients di
SET consumption_mode = case when fi.unit = 'count' then 'quantity' else 'toggle' end
FROM public.fridge_items fi
WHERE fi.id = di.fridge_item_id
  AND di.consumption_mode IS DISTINCT FROM (case when fi.unit = 'count' then 'quantity' else 'toggle' end);

-- Step 2: toggle 행의 amount 정리 (사용량을 측정하지 않는 단위)
UPDATE public.dish_ingredients
SET amount = null
WHERE consumption_mode = 'toggle'
  AND amount IS NOT NULL;

-- usage_status가 비어 있는 행은 '사용'으로 간주 (현재 데이터에는 없으나 방어적으로 처리)
UPDATE public.dish_ingredients
SET usage_status = 'used'
WHERE usage_status IS NULL;

-- Step 3: 제약
ALTER TABLE public.dish_ingredients
  ALTER COLUMN consumption_mode SET NOT NULL;

ALTER TABLE public.dish_ingredients
  DROP CONSTRAINT IF EXISTS dish_ingredients_consumption_shape_check;

ALTER TABLE public.dish_ingredients
  ADD CONSTRAINT dish_ingredients_consumption_shape_check
  CHECK (
    (consumption_mode = 'quantity' AND amount IS NOT NULL AND usage_status = 'used')
    OR
    (consumption_mode = 'toggle' AND amount IS NULL AND usage_status IN ('used', 'depleted'))
  );

-- Step 4: 파생 트리거
create or replace function public.sync_dish_ingredient_consumption_mode()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit text;
begin
  select fi.unit
    into v_unit
  from public.fridge_items fi
  where fi.id = new.fridge_item_id;

  new.consumption_mode := case when v_unit = 'count' then 'quantity' else 'toggle' end;

  return new;
end;
$$;

drop trigger if exists sync_dish_ingredient_consumption_mode on public.dish_ingredients;
create trigger sync_dish_ingredient_consumption_mode
  before insert or update of fridge_item_id, consumption_mode
  on public.dish_ingredients
  for each row
  execute function public.sync_dish_ingredient_consumption_mode();

select pg_notify('pgrst', 'reload schema');
