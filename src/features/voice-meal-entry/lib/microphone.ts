/**
 * @description 이 브라우저가 앱의 마이크 받아쓰기(마이크 입력 + 오디오 처리 + WebSocket)를 쓸 수 있는지 확인한다.
 * 하나라도 없으면 마이크 버튼을 숨기고 글 입력만 남긴다.
 */
export function isMicrophoneSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof window.AudioContext === 'function' &&
    typeof window.WebSocket === 'function'
  );
}

/**
 * @description getUserMedia 실패가 사용자의 권한 거부(또는 브라우저 정책 차단)인지 판별한다.
 * 그 밖의 실패(마이크 장치 없음 등)는 false.
 */
export function isMicrophonePermissionError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'NotAllowedError' || error.name === 'SecurityError')
  );
}
