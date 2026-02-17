import { round } from 'es-toolkit';

const AMOUNT_PRECISION = 3;
const AMOUNT_EPSILON = 1e-6;

/**
 * @description 수량 값을 고정 소수점 자릿수(기본 3자리)로 정규화합니다.
 */
export function normalizeAmount(value: number) {
  if (!Number.isFinite(value)) return 0;
  return round(value, AMOUNT_PRECISION);
}

/**
 * @description 두 수량 값을 더한 뒤 정규화된 값을 반환합니다.
 */
export function addAmount(left: number, right: number) {
  return normalizeAmount(left + right);
}

/**
 * @description 오른쪽 수량을 뺀 뒤 음수를 방지하고 정규화된 값을 반환합니다.
 */
export function subtractAmount(left: number, right: number) {
  return Math.max(0, normalizeAmount(left - right));
}

/**
 * @description 수량이 0보다 큰지(부동소수점 오차 허용) 검사합니다.
 */
export function isPositiveAmount(value: number) {
  return normalizeAmount(value) > AMOUNT_EPSILON;
}

/**
 * @description 두 수량 비교에서 left > right 여부를 오차 허용으로 검사합니다.
 */
export function isGreaterAmount(left: number, right: number) {
  return normalizeAmount(left) - normalizeAmount(right) > AMOUNT_EPSILON;
}
