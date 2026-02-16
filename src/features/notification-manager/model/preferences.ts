export type ExpiryNotificationOption = 'today' | 'this_week';

/**
 * @description 유통기한 알림 옵션의 의미를 정의합니다.
 * - `today`: D-1 알림만 발송합니다.
 * - `this_week`: D-7부터 D-1까지 알림을 발송합니다.
 */
export const EXPIRY_NOTIFICATION_OPTIONS = [
  { value: 'today' as const, label: '당일' },
  { value: 'this_week' as const, label: '이번주만' },
] as const;

/**
 * @description 선택된 옵션을 알림 기준 일수 배열로 변환합니다.
 */
export function toExpiryRemindDays(option: ExpiryNotificationOption): number[] {
  if (option === 'today') return [1];
  return [7, 6, 5, 4, 3, 2, 1];
}

/**
 * @description 저장된 알림 기준 일수 배열을 화면 옵션으로 역변환합니다.
 */
export function toExpiryNotificationOption(
  remindDays: number[] | null | undefined,
): ExpiryNotificationOption {
  if (!remindDays || remindDays.length === 0) return 'this_week';
  if (remindDays.length === 1 && remindDays[0] === 1) return 'today';
  return 'this_week';
}
