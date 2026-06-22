/**
 * @description 식단 재고 선택 Screen에서 선택된 fridge_item_id를 이전 화면으로 전달하기 위한 단일 콜백 저장소.
 * Stackflow params는 함수 직렬화가 불가능하므로, 모듈 스코프에 단일 콜백을 보관하고
 * 검색 화면이 열리기 직전에 등록, 선택 완료 또는 취소 시 실행·해제한다.
 * 검색 Activity는 항상 한 번에 하나만 열리므로 단일 변수로 충분하다.
 * 장보기/냉장고의 상품명(문자열) 검색과 달리, 식단은 기존 재고를 id로 택일하므로 별도 저장소를 둔다.
 */

type SelectCallback = (fridgeItemId: string) => void;

let pendingCallback: SelectCallback | null = null;

/**
 * @description fridge_item 선택 콜백을 등록한다. 기존 콜백이 있으면 덮어쓴다.
 */
export function setPendingFridgeItemCallback(callback: SelectCallback) {
  pendingCallback = callback;
}

/**
 * @description 등록된 콜백을 실행하고 초기화한다.
 */
export function resolvePendingFridgeItemCallback(fridgeItemId: string) {
  pendingCallback?.(fridgeItemId);
  pendingCallback = null;
}

/**
 * @description 등록된 콜백을 실행하지 않고 초기화한다 (취소/언마운트 시).
 */
export function clearPendingFridgeItemCallback() {
  pendingCallback = null;
}
