import { josa } from 'es-hangul';

/**
 * @description 외식비 등록 알림 본문을 만든다. 포장/배달은 주문 문구로, 식당/카페는 외식비 등록 문구로 보낸다.
 * 플랫폼(store)은 선택 입력이라 없으면 플랫폼 구절을 뺀다.
 */
export function buildDiningExpenseNotificationBody(
  nickname: string,
  expense: { kind: string; brand: string; store: string | null },
): string {
  if (expense.kind !== 'delivery') {
    return `${nickname}님이 ${expense.brand} 외식비를 등록했어요`;
  }

  const platform = expense.store ? ` ${josa(expense.store, '으로/로')}` : '';
  return `${nickname}님이 ${josa(expense.brand, '을/를')}${platform} 주문했어요`;
}
