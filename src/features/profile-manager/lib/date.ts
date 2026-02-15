import { differenceInCalendarDays, startOfDay } from 'date-fns';

/**
 * @description 업데이트 일자를 오늘 기준 일수로 변환합니다.
 */
export function formatUpdatedDaysAgo(updatedAt: string) {
  const updatedDate = new Date(updatedAt);
  if (Number.isNaN(updatedDate.getTime())) return '수정일 정보 없음';

  const daysAgo = differenceInCalendarDays(startOfDay(new Date()), startOfDay(updatedDate));
  if (daysAgo <= 0) return '오늘 업데이트됨';
  return `${daysAgo}일 전 수정됨`;
}
