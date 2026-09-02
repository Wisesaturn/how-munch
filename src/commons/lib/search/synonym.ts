import { normalizeSearchText } from './hangulSearch';

/**
 * 정규화된 단어 → 같은 그룹에 속한 단어 목록.
 * 조회 비용을 검색어 입력마다 치르지 않도록 미리 만들어 둔 역색인이다.
 */
export type SynonymIndex = ReadonlyMap<string, readonly string[]>;

/** 동의어 그룹 하나 — 같은 물건을 가리키는 단어들의 집합 */
export interface SynonymGroup {
  groupKey: string;
  terms: string[];
}

/**
 * @description 동의어 그룹 목록으로 검색용 역색인을 만든다.
 * 그룹은 대칭이므로 그룹 안의 모든 단어가 같은 그룹 전체를 가리키도록 색인한다.
 */
export function createSynonymIndex(groups: readonly SynonymGroup[]): SynonymIndex {
  const index = new Map<string, readonly string[]>();

  groups.forEach((group) => {
    group.terms.forEach((term) => {
      const normalized = normalizeSearchText(term);
      if (!normalized) return;
      index.set(normalized, group.terms);
    });
  });

  return index;
}

/**
 * @description 검색어가 속한 동의어 그룹의 나머지 단어를 돌려준다.
 * 검색어 자신은 직접 일치로 이미 처리되므로 제외한다. 그룹이 없으면 빈 배열이다.
 */
export function expandWithSynonyms(query: string, index: SynonymIndex): string[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const group = index.get(normalizedQuery);
  if (!group) return [];

  return group.filter((term) => normalizeSearchText(term) !== normalizedQuery);
}
