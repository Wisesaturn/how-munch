'use client';

import { useMemo } from 'react';

import { createSynonymIndex, expandWithSynonyms } from '@/commons/lib';

import { useSearchSynonymsQuery } from '../api/queries';

import { groupSynonymTerms } from './useSearchFilter';

/**
 * @description 검색어를 같은 유사어 그룹의 단어들로 확장해 돌려준다.
 * 서버(DB ILIKE)에서 거르는 검색 화면용이다. 클라이언트에서 확장한 단어 목록을 넘겨
 * 서버가 OR 조건으로 묶게 하면, 초성·조합 매칭 없이 동의어만 서버 검색에 적용할 수 있다.
 * 검색어가 비어 있으면 빈 배열, 그룹이 없으면 검색어 하나만 담긴 배열이다.
 */
export function useSynonymExpandedTerms(query: string): string[] {
  const { data: synonymTerms } = useSearchSynonymsQuery();

  return useMemo(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const index = createSynonymIndex(
      groupSynonymTerms(synonymTerms ?? []).map(({ groupKey, terms }) => ({
        groupKey,
        terms: terms.map((term) => term.term),
      })),
    );

    return [trimmedQuery, ...expandWithSynonyms(trimmedQuery, index)];
  }, [query, synonymTerms]);
}
