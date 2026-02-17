/** 재료 수량 단위 */
export type IngredientUnit = 'count' | 'g' | 'kg';

/**
 * @description 무게 단위(g, kg)인지 확인합니다.
 */
export function isWeightUnit(unit: IngredientUnit | undefined) {
  return unit === 'g' || unit === 'kg';
}

/**
 * @description 단위 값을 g 기준으로 변환합니다.
 */
export function toGrams(value: number, unit: IngredientUnit) {
  if (unit === 'kg') return value * 1000;
  if (unit === 'g') return value;
  return null;
}

/**
 * @description g 기준 값을 목표 단위로 변환합니다.
 */
export function fromGrams(grams: number, unit: IngredientUnit) {
  if (unit === 'kg') return grams / 1000;
  if (unit === 'g') return grams;
  return null;
}

/**
 * @description 동일 계열 단위 간 수량을 변환합니다. 개 단위와 교차하면 null을 반환합니다.
 */
export function convertIngredientAmount(value: number, from: IngredientUnit, to: IngredientUnit) {
  if (from === to) return value;
  if (!isWeightUnit(from) || !isWeightUnit(to)) return null;

  const grams = toGrams(value, from);
  if (grams === null) return null;
  return fromGrams(grams, to);
}

/**
 * @description 무게 값은 1000g 이상이면 kg(소수점 2자리), 미만이면 g로 표시합니다.
 */
export function formatWeightAuto(value: number, unit: IngredientUnit) {
  const grams = toGrams(value, unit);
  if (grams === null) return String(value);
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)}kg`;
  return `${Math.round(grams)}g`;
}

/**
 * @description 수량과 단위를 사용자 표시 문자열로 변환합니다.
 */
export function formatIngredientAmount(value: number, unit: IngredientUnit, dynamicWeight = false) {
  if (unit === 'count') return `${value}개`;
  if (dynamicWeight) return formatWeightAuto(value, unit);
  return `${value}${unit}`;
}
