/**
 * @description 계산기 Activity의 금액 param을 숫자로 좁힙니다.
 * 새로고침으로 URL에서 복원되면 문자열이므로 숫자로 변환하고, 금액이 아니면 null을 돌려줍니다.
 */
export function parseCalculatorAmount(value: number | string | undefined): number | null {
  if (value === undefined || value === '') return null;

  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? amount : null;
}

/**
 * @description 계산기 Activity의 nullable param을 boolean으로 좁힙니다.
 * 새로고침으로 URL에서 복원되면 'true' 문자열로 들어옵니다.
 */
export function parseCalculatorNullable(value: boolean | string | undefined): boolean {
  return value === true || value === 'true';
}
