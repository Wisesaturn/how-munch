/**
 * @description 초 단위 값을 `mm:ss` 문자열로 변환합니다.
 */
export function formatSecondsToTimer(remainingSeconds: number) {
  const minutes = Math.floor(remainingSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (remainingSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
