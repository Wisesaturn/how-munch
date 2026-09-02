-- 역할: dish_ingredients.consumption_mode를 참조 품목의 단위로부터 파생시킵니다.
-- 동작:
-- 1. BEFORE INSERT/UPDATE 시점에 fridge_items.unit을 조회합니다.
-- 2. unit이 'count'면 'quantity'(사용량 기록), 그 외 무게·부피 단위면 'toggle'(사용/소진 여부만 기록)로 설정합니다.
-- 3. 앱이 consumption_mode를 직접 써 보내도 항상 덮어써서 단위와 어긋나지 않도록 강제합니다.
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
