'use client';

import { useMemo } from 'react';

import {
  containsSearchText,
  createSynonymIndex,
  expandWithSynonyms,
  matchesComposingText,
  matchesSearchText,
} from '@/commons/lib';

import { useSearchSynonymsQuery } from '../api/queries';

import { type SearchFilterResult, type SearchSynonymTerm } from './types';

/**
 * @description 유사어 단어 목록을 group_key 기준으로 묶는다.
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
 * @description 검색어로 목록을 걸러 직접 일치와 유사어 매칭으로 나눈다.
 * 직접 일치는 공백 무시 부분일치와 초성 검색까지만 인정한다.
 * 유사어로 확장된 단어와 한글 조합 중간 상태는 '유사어 매칭'으로 내려보낸다.
 * 조합 중간 매칭은 음절 경계를 넘나들어('닭'이 '달걀'에 걸린다) 직접 일치로 두면
 * 재고를 골라 차감하는 화면에서 오선택 위험이 있기 때문이다.
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

      const matchesSynonym = expandedTerms.some((term) =>
        texts.some((text) => containsSearchText(text, term)),
      );

      if (matchesSynonym || texts.some((text) => matchesComposingText(text, trimmedQuery))) {
        similar.push(item);
      }
    });

    return { exact, similar };
  }, [items, query, getSearchTexts, synonymIndex]);
}
