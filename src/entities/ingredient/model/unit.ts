/** 재료 수량 단위 */
export type IngredientUnit = 'count' | 'g' | 'kg' | 'ml' | 'l';

/**
 * @description 무게 단위(g, kg)인지 확인합니다.
 */
export function isWeightUnit(unit: IngredientUnit | undefined) {
  return unit === 'g' || unit === 'kg';
}

/**
 * @description 부피 단위(ml, l)인지 확인합니다.
 */
export function isVolumeUnit(unit: IngredientUnit | undefined) {
  return unit === 'ml' || unit === 'l';
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
 * @description 단위 값을 ml 기준으로 변환합니다.
 */
export function toMilliliters(value: number, unit: IngredientUnit) {
  if (unit === 'l') return value * 1000;
  if (unit === 'ml') return value;
  return null;
}

/**
 * @description ml 기준 값을 목표 단위로 변환합니다.
 */
export function fromMilliliters(ml: number, unit: IngredientUnit) {
  if (unit === 'l') return ml / 1000;
  if (unit === 'ml') return ml;
  return null;
}

/**
 * @description 동일 계열 단위 간 수량을 변환합니다. 계열이 다르거나 개 단위와 교차하면 null을 반환합니다.
 */
export function convertIngredientAmount(value: number, from: IngredientUnit, to: IngredientUnit) {
  if (from === to) return value;

  if (isWeightUnit(from) && isWeightUnit(to)) {
    const grams = toGrams(value, from);
    if (grams === null) return null;
    return fromGrams(grams, to);
  }

  if (isVolumeUnit(from) && isVolumeUnit(to)) {
    const ml = toMilliliters(value, from);
    if (ml === null) return null;
    return fromMilliliters(ml, to);
  }

  return null;
}

/**
 * @description 무게 값은 1000g 이상이면 kg(소수점 1자리), 미만이면 g로 표시합니다.
 */
export function formatWeightAuto(value: number, unit: IngredientUnit) {
  const grams = toGrams(value, unit);
  if (grams === null) return String(value);
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)}kg`;
  return `${Math.round(grams)}g`;
}

/**
 * @description 부피 값은 1000ml 이상이면 l(소수점 1자리), 미만이면 ml로 표시합니다.
 */
export function formatVolumeAuto(value: number, unit: IngredientUnit) {
  const ml = toMilliliters(value, unit);
  if (ml === null) return String(value);
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)}L`;
  return `${Math.round(ml)}ml`;
}

/**
 * @description 수량과 단위를 사용자 표시 문자열로 변환합니다.
 */
export function formatIngredientAmount(value: number, unit: IngredientUnit, dynamicUnit = false) {
  if (unit === 'count') return `${value}개`;
  if (dynamicUnit) {
    if (isWeightUnit(unit)) return formatWeightAuto(value, unit);
    if (isVolumeUnit(unit)) return formatVolumeAuto(value, unit);
  }
  const UNIT_DISPLAY: Record<IngredientUnit, string> = {
    count: '개',
    g: 'g',
    kg: 'kg',
    ml: 'ml',
    l: 'L',
  };
  return `${value}${UNIT_DISPLAY[unit]}`;
}

/**
 * @description 단위별 수량 입력 최소값을 반환합니다.
 */
export function resolveAmountMin(unit: IngredientUnit) {
  if (unit === 'kg' || unit === 'l') return 0.1;
  return 1;
}

/**
 * @description 단위별 수량 입력 step 값을 반환합니다.
 */
export function resolveAmountStep(unit: IngredientUnit) {
  if (unit === 'kg' || unit === 'l') return 0.1;
  return 1;
}

/**
 * @description 단위별 수량을 입력 규칙에 맞게 정규화합니다.
 */
export function normalizeAmountByUnit(value: number, unit: IngredientUnit) {
  if (!Number.isFinite(value)) return resolveAmountMin(unit);
  if (unit === 'kg' || unit === 'l') return Number(value.toFixed(1));
  return Math.round(value);
}

/**
 * @description 단위별 수량 소수점 유효성을 검사합니다. kg/l는 소수점 1자리, 나머지는 정수만 허용합니다.
 */
export function validateAmountPrecisionByUnit(value: number, unit: IngredientUnit) {
  if (!Number.isFinite(value)) return false;
  if (unit === 'kg' || unit === 'l') return Number.isInteger(value * 10);
  return Number.isInteger(value);
}

/**
 * @description 상품명에서 개수/용량 표기를 추출해 count와 unit을 계산합니다.
 * 우선순위는 개수 표기(N개·N개입·N팩 등) > 용량/중량 표기(g/kg/ml/l) > 기본(개)입니다.
 * 개수 표기가 있으면 `{ count: 개수 × receiptCount, unit: 'count' }`,
 * 없고 용량 표기가 있으면 `{ count: 용량숫자 × receiptCount, unit: 해당 단위 }`,
 * 둘 다 없으면 `{ count: receiptCount, unit: 'count' }`를 반환합니다.
 * 대소문자를 무시하고 각 표기의 첫 번째 매칭만 사용합니다.
 * (예: '우동면 5개입 1.15kg' × 1 → `{ count: 5, unit: 'count' }`, '삼겹살 500g' × 1 → `{ count: 500, unit: 'g' }`)
 */
export function parseProductNameUnit(
  name: string,
  receiptCount: number,
): { count: number; unit: IngredientUnit } {
  const safeCount = Number.isFinite(receiptCount) && receiptCount > 0 ? receiptCount : 1;
  const fallback = { count: safeCount, unit: 'count' as IngredientUnit };

  // 1) 개수 표기 우선 (예: '5개입', '3팩', '2입')
  const countMatch = name.match(/(\d+)\s*(개입|개|팩|입)/);
  if (countMatch) {
    const quantity = Number.parseInt(countMatch[1], 10);
    if (Number.isFinite(quantity) && quantity > 0) {
      return { count: quantity * safeCount, unit: 'count' };
    }
  }

  // 2) 용량/중량 표기 (예: '1L', '500g')
  const volumeMatch = name.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/i);
  if (volumeMatch) {
    const amount = Number.parseFloat(volumeMatch[1]);
    if (Number.isFinite(amount) && amount > 0) {
      const unit = volumeMatch[2].toLowerCase() as IngredientUnit;
      return { count: normalizeAmountByUnit(amount * safeCount, unit), unit };
    }
  }

  return fallback;
}
