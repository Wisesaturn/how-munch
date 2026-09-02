import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';

import { type SearchSynonymTerm } from '../model/types';

import { searchSynonymKeys } from './queryKey';

/**
 * @description 내 가구의 검색 별칭 전체를 조회한다.
 * 별칭은 등록·삭제·복원 시점에만 바뀌므로 시간 기반 만료 대신 명시적 무효화로만 갱신한다.
 */
export function useSearchSynonymsQuery() {
  return useQuery({
    queryKey: searchSynonymKeys.list(),
    queryFn: () => apiClient.get<SearchSynonymTerm[]>('/api/search-synonyms'),
    staleTime: Infinity,
  });
}
