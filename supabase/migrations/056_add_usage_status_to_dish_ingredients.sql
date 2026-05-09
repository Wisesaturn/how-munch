-- Migration: 056_add_usage_status_to_dish_ingredients
-- 역할: g/kg 단위 재료의 사용/소진 상태를 식단에 기록하기 위한 스키마 변경
-- 동작:
-- 1. dish_ingredients.amount를 nullable로 변경 (g/kg 품목은 수량 없이 상태만 기록)
-- 2. dish_ingredients.usage_status 컬럼 추가 ('used' | 'depleted')
-- 3. 기존 레코드 backfill: amount > 0인 기존 데이터는 모두 'used'로 설정

-- Step 1: amount nullable 허용
ALTER TABLE public.dish_ingredients
  ALTER COLUMN amount DROP NOT NULL;

-- Step 2: usage_status 컬럼 추가
ALTER TABLE public.dish_ingredients
  ADD COLUMN usage_status text CHECK (usage_status IN ('used', 'depleted'));

-- Step 3: 기존 레코드 backfill — 기존 amount > 0 데이터는 모두 'used'
UPDATE public.dish_ingredients
  SET usage_status = 'used'
  WHERE amount IS NOT NULL AND amount > 0;
