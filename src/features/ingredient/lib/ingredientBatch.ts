import {
  normalizeAmountByUnit,
  resolveAmountStep,
  type IngredientUnit,
} from '@/entities/ingredient';

/** 등록 화면에서 편집 중인 배치 한 행 */
export interface IngredientBatchDraft {
  id: string;
  quantity: number;
  expiry_date: string | null;
}

/** add_ingredient_with_fridge의 p_batches 항목. expiry_date가 없으면 카테고리 기본값을 쓴다 */
export interface IngredientBatchInput {
  quantity: number;
  expiry_date?: string | null;
}

/** update_ingredient_with_fridge의 batch_quantities 항목 */
export interface IngredientBatchQuantityInput {
  id: string;
  initial_quantity: number;
}

const MAX_BATCH_PARTS = 20;
const DEFAULT_BATCH_PARTS = 2;
const MAX_AUTO_SPLIT_COUNT = 5;

/**
 * @description 수량을 입력 단위(개·g은 1, kg·L은 0.1) 기준으로 몇 번 나눌 수 있는지 계산한다.
 * 부동소수 오차를 피하려고 정수 단계 수로 바꿔 다룬다.
 */
function toAmountSteps(amount: number, unit: IngredientUnit) {
  return Math.round(amount / resolveAmountStep(unit));
}

/**
 * @description 수량을 parts개로 최대한 균등하게 나눈다. 나머지는 앞 행부터 한 단계씩 더한다.
 * (예: 10개를 3개로 → 4/3/3)
 */
export function splitAmountEvenly(total: number, parts: number, unit: IngredientUnit): number[] {
  const steps = toAmountSteps(total, unit);
  const base = Math.floor(steps / parts);
  const remainder = steps % parts;
  const step = resolveAmountStep(unit);

  return Array.from({ length: parts }, (_, index) =>
    normalizeAmountByUnit((base + (index < remainder ? 1 : 0)) * step, unit),
  );
}

/**
 * @description 수량을 나눌 수 있는 최대 배치 수를 반환한다. 2 미만이면 나눌 수 없다.
 */
export function resolveMaxBatchParts(total: number, unit: IngredientUnit) {
  return Math.min(toAmountSteps(total, unit), MAX_BATCH_PARTS);
}

/**
 * @description [배치 나누기]를 눌렀을 때의 기본 배치 수를 정한다.
 * 적은 개수는 1개씩 나누는 경우가 가장 흔하므로 수량만큼, 그 외에는 2개로 시작한다.
 */
export function resolveDefaultBatchParts(total: number, unit: IngredientUnit) {
  const max = resolveMaxBatchParts(total, unit);
  if (unit === 'count' && total <= MAX_AUTO_SPLIT_COUNT) return max;
  return Math.min(DEFAULT_BATCH_PARTS, max);
}

/**
 * @description 배치 수 변경에 맞춰 행을 다시 만든다. 수량은 균등 분할하고,
 * 기존 행의 id와 유통기한은 유지하며 새 행은 fallbackExpiry를 쓴다.
 */
export function createBatchDrafts(
  total: number,
  parts: number,
  unit: IngredientUnit,
  existing: IngredientBatchDraft[],
  fallbackExpiry: string | null,
): IngredientBatchDraft[] {
  return splitAmountEvenly(total, parts, unit).map((quantity, index) => ({
    id: existing[index]?.id ?? crypto.randomUUID(),
    quantity,
    expiry_date: existing[index] ? existing[index].expiry_date : fallbackExpiry,
  }));
}

/**
 * @description 배치 수량 합계를 단위 규칙에 맞게 정규화해 반환한다.
 */
export function sumBatchQuantity(
  batches: Pick<IngredientBatchDraft, 'quantity'>[],
  unit: IngredientUnit,
) {
  return normalizeAmountByUnit(
    batches.reduce((sum, batch) => sum + batch.quantity, 0),
    unit,
  );
}

/**
 * @description 입력된 유통기한 중 가장 빠른 날짜를 반환한다. 입력이 없으면 null이다.
 * 나누기를 취소할 때 실제보다 늦게 표시돼 유통기한 알림을 놓치지 않도록 가장 빠른 날짜를 쓴다.
 */
export function resolveEarliestExpiry(batches: Pick<IngredientBatchDraft, 'expiry_date'>[]) {
  const dates = batches
    .map((batch) => batch.expiry_date)
    .filter((date): date is string => Boolean(date))
    .sort();
  return dates[0] ?? null;
}

/**
 * @description 폼 값을 저장 API의 batches로 변환한다.
 * 유통기한을 건드리지 않은 단일 배치는 undefined를 돌려 서버의 카테고리 기본값 계산에 맡긴다.
 */
export function buildIngredientBatchInputs(values: {
  count: number;
  expiry_date?: string | null;
  batches?: IngredientBatchDraft[];
}): IngredientBatchInput[] | undefined {
  if (values.batches && values.batches.length > 0) {
    return values.batches.map(({ quantity, expiry_date }) => ({ quantity, expiry_date }));
  }
  if (values.expiry_date === undefined) return undefined;
  return [{ quantity: values.count, expiry_date: values.expiry_date }];
}
