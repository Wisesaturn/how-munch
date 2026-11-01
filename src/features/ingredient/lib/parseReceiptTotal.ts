/**
 * @description Claude AI 응답에서 영수증에 인쇄된 합계(receipt_total)를 읽는다.
 * 합계가 없거나 0 이하·숫자가 아닌 값이면 비교할 수 없으므로 null을 반환한다.
 * 품목 파싱과 달리 합계는 보조 정보이므로 JSON이 깨져 있어도 throw하지 않는다.
 */
export function parseReceiptTotal(text: string): number | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed: unknown = JSON.parse(jsonMatch[0]);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const total = (parsed as { receipt_total?: unknown }).receipt_total;
    return typeof total === 'number' && Number.isFinite(total) && total > 0
      ? Math.round(total)
      : null;
  } catch {
    return null;
  }
}
