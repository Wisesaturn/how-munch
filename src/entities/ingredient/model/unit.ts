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

/** 상품 규격 표기에서 읽어낸 용량·중량 정보 */
export interface ProductMeasure {
  amount: number;
  unit: IngredientUnit;
  /** 원문에서 매칭된 표기 그대로. 이름에 되살릴 때 대소문자를 보존하기 위해 사용한다 */
  text: string;
}

/** 상품 규격 표기 파싱 결과 */
export interface ProductSpec {
  /** 개수 표기(N개·N개입·N팩·N입)에서 읽은 수. 표기가 없으면 null */
  packCount: number | null;
  /** 용량·중량 표기(g·kg·ml·l). 표기가 없으면 null */
  measure: ProductMeasure | null;
}

/**
 * @description 상품 규격 표기(예: '5개입', '500g', '500g 2팩')를 파싱한다.
 * 개수 표기와 용량 표기는 배타적이지 않으므로 둘을 각각 독립적으로 추출해 함께 반환한다.
 * 개수는 수량 계산에, 용량은 규격 구분자로 쓰이므로 한쪽이 매칭돼도 다른 쪽 검사를 멈추지 않는다.
 * 대소문자를 무시하며 각 표기의 첫 번째 매칭만 사용한다.
 * (예: '500g 2팩' → `{ packCount: 2, measure: { amount: 500, unit: 'g', text: '500g' } }`,
 *  '5개입' → `{ packCount: 5, measure: null }`)
 */
export function parseProductSpec(spec: string): ProductSpec {
  const empty: ProductSpec = { packCount: null, measure: null };
  if (!spec) return empty;

  let packCount: number | null = null;
  const countMatch = spec.match(/(\d+)\s*(개입|개|팩|입)/);
  if (countMatch) {
    const parsed = Number.parseInt(countMatch[1], 10);
    if (Number.isFinite(parsed) && parsed > 0) packCount = parsed;
  }

  let measure: ProductMeasure | null = null;
  const measureMatch = spec.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/i);
  if (measureMatch) {
    const amount = Number.parseFloat(measureMatch[1]);
    if (Number.isFinite(amount) && amount > 0) {
      measure = {
        amount,
        unit: measureMatch[2].toLowerCase() as IngredientUnit,
        text: measureMatch[0].trim(),
      };
    }
  }

  return { packCount, measure };
}
