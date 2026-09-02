/** 유사어 단어 한 줄 (DB row) */
export interface SearchSynonymTerm {
  id: string;
  group_key: string;
  term: string;
  created_at: string;
}

/** 같은 group_key로 묶인 유사어 그룹 — 화면 표시 단위 */
export interface SearchSynonymGroupView {
  groupKey: string;
  terms: SearchSynonymTerm[];
}

/** 검색 결과를 직접 일치와 유사어 일치로 나눈 형태 */
export interface SearchFilterResult<T> {
  exact: T[];
  similar: T[];
}
