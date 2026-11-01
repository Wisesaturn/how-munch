/**
 * @description 계산기 Screen에서 확정한 금액을 이전 화면으로 전달하기 위한 단일 콜백 저장소.
 * Stackflow params는 함수 직렬화가 불가능하므로, 모듈 스코프에 단일 콜백을 보관하고
 * 계산기가 열리기 직전에 등록, 확인 또는 취소 시 실행·해제한다.
 * 계산기 Activity는 항상 한 번에 하나만 열리므로 단일 변수로 충분하다.
 */

type ConfirmCallback = (value: number | null) => void;

let pendingCallback: ConfirmCallback | null = null;

/**
 * @description 금액 확정 콜백을 등록한다. 기존 콜백이 있으면 덮어쓴다.
 */
export function setPendingAmountCalculatorCallback(callback: ConfirmCallback) {
  pendingCallback = callback;
}

/**
 * @description 등록된 콜백을 실행하고 초기화한다.
 */
export function resolvePendingAmountCalculatorCallback(value: number | null) {
  pendingCallback?.(value);
  pendingCallback = null;
}

/**
 * @description 등록된 콜백을 실행하지 않고 초기화한다 (취소 시).
 */
export function clearPendingAmountCalculatorCallback() {
  pendingCallback = null;
}
