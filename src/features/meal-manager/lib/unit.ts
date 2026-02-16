/**
 * @description 재료 단위 값을 사용자 표시용 문자열(개/g)로 변환합니다.
 */
function resolveIngredientUnitLabel(unit: 'count' | 'g' | undefined) {
  if (unit === 'count') return '개';
  if (unit === 'g') return 'g';
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
 * @description 슬라이더 최소/최대값과 비활성 상태를 재고 수량 기준으로 계산합니다.
 */
function resolveSliderBoundaries(totalCount: number | string | undefined) {
  const parsedCount = Number(totalCount);
  if (!Number.isFinite(parsedCount)) return { min: 1, max: 1, disabled: true };

  const max = Math.max(0, parsedCount);
  if (max < 1) return { min: 1, max: 1, disabled: true };

  return { min: 1, max, disabled: false };
}

export { parseIngredientAmount, resolveIngredientUnitLabel, resolveSliderBoundaries };
