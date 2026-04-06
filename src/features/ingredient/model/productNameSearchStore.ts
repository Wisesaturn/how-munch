/**
 * @description 상품명 검색 Screen에서 선택된 값을 이전 화면으로 전달하기 위한 단일 콜백 저장소.
 * Stackflow params는 함수 직렬화가 불가능하므로, 모듈 스코프에 단일 콜백을 보관하고
 * 검색 화면이 열리기 직전에 등록, 선택 완료 또는 취소 시 실행·해제한다.
 * 검색 Activity는 항상 한 번에 하나만 열리므로 단일 변수로 충분하다.
 */

type SelectCallback = (name: string) => void;

let pendingCallback: SelectCallback | null = null;

/**
 * @description 상품명 선택 콜백을 등록한다. 기존 콜백이 있으면 덮어쓴다.
 */
export function setPendingProductNameCallback(callback: SelectCallback) {
  pendingCallback = callback;
}

/**
 * @description 등록된 콜백을 실행하고 초기화한다.
 */
export function resolvePendingProductNameCallback(name: string) {
  pendingCallback?.(name);
  pendingCallback = null;
}

/**
 * @description 등록된 콜백을 실행하지 않고 초기화한다 (취소/언마운트 시).
 */
export function clearPendingProductNameCallback() {
  pendingCallback = null;
}
