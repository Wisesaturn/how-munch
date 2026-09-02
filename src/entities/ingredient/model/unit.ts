/** 재료 수량 단위 */
export type IngredientUnit = 'count' | 'g' | 'kg' | 'ml' | 'l';

const INGREDIENT_UNITS: readonly IngredientUnit[] = ['count', 'g', 'kg', 'ml', 'l'];

/**
 * @description 임의의 값이 유효한 IngredientUnit인지 검사합니다.
 * AI 응답처럼 외부에서 들어온 unit 값을 신뢰하기 전에 좁히는 용도로 사용합니다.
 */
export function isIngredientUnit(value: unknown): value is IngredientUnit {
  return typeof value === 'string' && (INGREDIENT_UNITS as readonly string[]).includes(value);
}

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

/** 상품 규격 표기(spec)의 종류 — 개수형 / 용량·중량형 / 표기 없음 */
export type ProductSpecKind = 'count' | 'measure' | 'none';

/** 상품 규격 표기 파싱 결과 */
export interface ProductSpec {
  kind: ProductSpecKind;
  /** 표기에서 읽어낸 수치. kind가 'none'이면 0 */
  amount: number;
  /** 표기가 가리키는 단위. kind가 'none'이면 'count' */
  unit: IngredientUnit;
}

/**
 * @description 상품 규격 표기(예: '5개입', '500g', '1L')를 파싱해 종류·수치·단위를 반환합니다.
 * 개수 표기(N개·N개입·N팩·N입)는 kind 'count', 용량/중량 표기(g·kg·ml·l)는 kind 'measure',
 * 어느 쪽도 아니거나 빈 문자열이면 kind 'none'입니다.
 * 개수 표기를 용량 표기보다 먼저 검사하고, 대소문자를 무시하며 각 표기의 첫 번째 매칭만 사용합니다.
 * (예: '5개입' → `{ kind: 'count', amount: 5, unit: 'count' }`,
 *  '500g' → `{ kind: 'measure', amount: 500, unit: 'g' }`)
 */
export function parseProductSpec(spec: string): ProductSpec {
  const none: ProductSpec = { kind: 'none', amount: 0, unit: 'count' };
  if (!spec) return none;

  // 1) 개수 표기 우선 (예: '5개입', '3팩', '2입')
  const countMatch = spec.match(/(\d+)\s*(개입|개|팩|입)/);
  if (countMatch) {
    const amount = Number.parseInt(countMatch[1], 10);
    if (Number.isFinite(amount) && amount > 0) return { kind: 'count', amount, unit: 'count' };
  }

  // 2) 용량/중량 표기 (예: '1L', '500g')
  const measureMatch = spec.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/i);
  if (measureMatch) {
    const amount = Number.parseFloat(measureMatch[1]);
    if (Number.isFinite(amount) && amount > 0) {
      return { kind: 'measure', amount, unit: measureMatch[2].toLowerCase() as IngredientUnit };
    }
  }

  return none;
}
