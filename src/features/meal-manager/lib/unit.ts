import { formatWeightAuto, isWeightUnit, type IngredientUnit } from '@/entities/ingredient';

/**
 * @description 재료 단위 값을 사용자 표시용 문자열(개/g/kg)로 변환합니다.
 */
function resolveIngredientUnitLabel(unit: IngredientUnit | undefined) {
  if (unit === 'count') return '개';
  if (unit === 'g') return 'g';
  if (unit === 'kg') return 'kg';
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
  if (!Number.isFinite(parsedCount)) return { min: 1, max: 1, disabled: true };

  const max = Math.max(0, parsedCount);
  if (max < 1) return { min: 1, max: 1, disabled: true };

  return { min: 1, max, disabled: false };
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
function resolveWeightSliderMin(unit: IngredientUnit | undefined, max: number) {
  if (unit === 'g') return max >= 10 ? 10 : 1;
  if (unit === 'kg') return max >= 0.1 ? 0.1 : 0.01;
  return 1;
}

export {
  formatIngredientAmountInfo,
  parseIngredientAmount,
  resolveIngredientUnitLabel,
  resolveSliderBoundaries,
  resolveWeightSliderMin,
  resolveWeightSliderStep,
};
