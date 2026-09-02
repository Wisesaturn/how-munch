'use client';

import { useMemo } from 'react';

import {
  containsSearchText,
  createSynonymIndex,
  expandWithSynonyms,
  matchesSearchText,
} from '@/commons/lib';

import { useSearchSynonymsQuery } from '../api/queries';

import { type SearchFilterResult, type SearchSynonymTerm } from './types';

/**
 * @description 별칭 단어 목록을 group_key 기준으로 묶는다.
 * DB는 단어 단위로 저장하지만 검색·화면 표시는 그룹 단위로 다룬다.
 */
export function groupSynonymTerms(terms: SearchSynonymTerm[]) {
  const groups = new Map<string, SearchSynonymTerm[]>();

  terms.forEach((term) => {
    const bucket = groups.get(term.group_key);
    if (bucket) bucket.push(term);
    else groups.set(term.group_key, [term]);
  });

  return [...groups.entries()].map(([groupKey, groupTerms]) => ({ groupKey, terms: groupTerms }));
}

/**
 * @description 검색어로 목록을 걸러 직접 일치와 별칭 일치로 나눈다.
 * 직접 일치는 공백 무시·초성·조합 중간 상태를 모두 인정하고,
 * 별칭으로 확장된 단어는 후보가 과하게 넓어지지 않도록 단순 부분일치만 적용한다.
 * 검색어가 비어 있으면 전체를 직접 일치로 돌려준다.
 */
export function useSearchFilter<T>(
  items: T[],
  query: string,
  getSearchTexts: (item: T) => string[],
): SearchFilterResult<T> {
  const { data: synonymTerms } = useSearchSynonymsQuery();

  const synonymIndex = useMemo(
    () =>
      createSynonymIndex(
        groupSynonymTerms(synonymTerms ?? []).map(({ groupKey, terms }) => ({
          groupKey,
          terms: terms.map((term) => term.term),
        })),
      ),
    [synonymTerms],
  );

  return useMemo(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return { exact: items, similar: [] };

    const expandedTerms = expandWithSynonyms(trimmedQuery, synonymIndex);

    const exact: T[] = [];
    const similar: T[] = [];

    items.forEach((item) => {
      const texts = getSearchTexts(item);

      if (texts.some((text) => matchesSearchText(text, trimmedQuery))) {
        exact.push(item);
        return;
      }

      if (expandedTerms.some((term) => texts.some((text) => containsSearchText(text, term)))) {
        similar.push(item);
      }
    });

    return { exact, similar };
  }, [items, query, getSearchTexts, synonymIndex]);
}
