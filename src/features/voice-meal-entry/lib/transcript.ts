/**
 * @description 받아쓰기 전에 적혀 있던 글, 확정된 문장들, 아직 말하는 중인 문장을 입력칸에 넣을 한 글로 합친다.
 * 빈 조각은 건너뛰고 조각 사이는 띄어쓰기 한 칸으로 잇는다.
 */
export function composeTranscript(baseText: string, committed: string[], partial: string): string {
  return [baseText, ...committed, partial]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(' ');
}
