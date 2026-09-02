-- Function: public.sync_dish_ingredient_consumption_mode
-- Source: supabase/migrations/081_fix_review_findings.sql
-- 역할: dish_ingredients의 기록 방식을 참조 품목의 단위로부터 파생시키고, 값 형태를 모드에 맞춥니다.
-- 동작:
-- 1. BEFORE INSERT/UPDATE 시점에 fridge_items.unit을 조회합니다.
-- 2. unit이 'count'면 'quantity'(사용량 기록), 그 외 무게·부피 단위면 'toggle'(사용/소진 여부만)로 설정합니다.
-- 3. 모드에 맞게 amount/usage_status를 함께 정규화합니다.
--    품목이 교차 단위로 재연결될 때(배치 이동 추종, 비운 품목 정리) 기존 값이 새 모드와 어긋나
--    dish_ingredients_consumption_shape_check에 걸려 상위 작업 전체가 실패하는 것을 막습니다.
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

  if new.consumption_mode = 'toggle' then
    new.amount := null;
    new.usage_status := coalesce(new.usage_status, 'used');
  else
    new.amount := coalesce(new.amount, 0);
    new.usage_status := 'used';
  end if;

  return new;
end;
$$;
