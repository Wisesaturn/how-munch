/**
 * @description 페이지네이션 메타데이터. 서버가 반환하는 페이지 정보를 담는다.
 */
export interface PageInfo {
  /** 현재 페이지 번호 (1-indexed) */
  page: number;
  /** 페이지당 항목 수 */
  pageSize: number;
  /** 전체 항목 수 */
  totalElements: number;
  /** 전체 페이지 수 */
  totalPages: number;
  /** 현재 페이지의 실제 항목 수 */
  numberOfElements: number;
  /** 현재 페이지가 비어있는지 여부 */
  empty: boolean;
  /** 첫 번째 페이지인지 여부 */
  first: boolean;
  /** 마지막 페이지인지 여부 */
  last: boolean;
}

/**
 * @description 페이지네이션이 적용된 응답 래퍼. contents에 실제 데이터 배열, pageInfo에 페이지 메타데이터를 담는다.
 */
export interface Page<T> {
  contents: T;
  pageInfo: PageInfo;
}
