import { formatWeightAuto, isWeightUnit, type IngredientUnit } from '@/entities/ingredient';

import { normalizeAmount } from '../model/amount';

/**
 * @description 재료 단위 값을 사용자 표시용 문자열(개/g/kg)로 변환합니다.
 */
function resolveIngredientUnitLabel(unit: IngredientUnit | undefined) {
  if (unit === 'count') return '개';
  if (unit === 'g') return 'g';
  if (unit === 'kg') return 'kg';
  if (unit === 'ml') return 'ml';
  if (unit === 'l') return 'L';
  return '단위';
}

/**
 * @description 재료 수량 입력 문자열을 0 이상의 숫자로 정규화합니다.
 */
function parseIngredientAmount(value: string) {
  if (!value) return 0;
  const parsedAmount = Number(value);
  if (!Number.isFinite(parsedAmount)) return 0;
  return Math.max(0, parsedAmount);
}

/**
 * @description 식단 재료 수량을 단위에 맞춰 표시 문자열로 변환합니다.
 */
function formatIngredientAmountInfo(value: number, unit: IngredientUnit | undefined) {
  if (!unit) return String(value);
  if (isWeightUnit(unit)) return formatWeightAuto(value, unit);
  return `${value}${resolveIngredientUnitLabel(unit)}`;
}

/**
 * @description 슬라이더 최소/최대값과 비활성 상태를 재고 수량 기준으로 계산합니다.
 */
function resolveSliderBoundaries(totalCount: number | string | undefined) {
  const parsedCount = Number(totalCount);
  if (!Number.isFinite(parsedCount)) return { min: 0, max: 0, disabled: true };

  // DB 수치 연산 후 부동소수점 오차(예: 0.099999999)가 UI 비활성화 조건을 깨지 않도록 보정합니다.
  const max = normalizeAmount(Math.max(0, parsedCount));
  if (max <= 0) return { min: 0, max: 0, disabled: true };

  return { min: 0, max, disabled: false };
}

/**
 * @description 단위별 슬라이더 step 값을 반환합니다.
 */
function resolveWeightSliderStep(unit: IngredientUnit | undefined) {
  if (unit === 'g') return 10;
  if (unit === 'kg') return 0.1;
  return 1;
}

/**
 * @description 단위별 슬라이더 최소값을 반환합니다.
 */
function resolveWeightSliderMin(unit: IngredientUnit | undefined) {
  if (unit === 'g') return 0;
  if (unit === 'kg') return 0;
  return 0;
}

export {
  formatIngredientAmountInfo,
  parseIngredientAmount,
  resolveIngredientUnitLabel,
  resolveSliderBoundaries,
  resolveWeightSliderMin,
  resolveWeightSliderStep,
};
