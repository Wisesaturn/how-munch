/**
 * @description 상품명 검색 Screen에서 선택된 값을 이전 화면으로 전달하기 위한 모듈 레벨 콜백 레지스트리.
 * stackflow params는 함수 직렬화가 불가능하므로, 콜백을 모듈 스코프에서 관리하고
 * Activity ID를 키로 등록·실행·해제하는 방식을 사용한다.
 */

type SelectCallback = (name: string) => void;

const registry = new Map<string, SelectCallback>();

/**
 * @description 상품명 선택 콜백을 레지스트리에 등록한다.
 */
export function registerProductNameSelectCallback(id: string, callback: SelectCallback) {
  registry.set(id, callback);
}

/**
 * @description 등록된 상품명 선택 콜백을 실행하고 레지스트리에서 제거한다.
 */
export function resolveProductNameSelectCallback(id: string, name: string) {
  const callback = registry.get(id);
  if (callback) {
    callback(name);
    registry.delete(id);
  }
}

/**
 * @description 등록된 상품명 선택 콜백을 레지스트리에서 제거한다.
 */
export function unregisterProductNameSelectCallback(id: string) {
  registry.delete(id);
}
