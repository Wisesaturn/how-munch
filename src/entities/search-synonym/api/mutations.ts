import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';

import { searchSynonymKeys } from './queryKey';

interface LinkSearchSynonymVariables {
  /** 검색창에 입력했던 기준 단어 */
  baseTerm: string;
  /** 기준 단어와 연결할 단어들 */
  terms: string[];
}

/**
 * @description 검색어와 입력 단어들을 하나의 별칭 그룹으로 연결한다.
 * 등록 직후 검색 결과에 바로 반영돼야 하므로 성공 시 목록 캐시를 무효화한다.
 */
export function useLinkSearchSynonymMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: LinkSearchSynonymVariables) =>
      apiClient.post<string>('/api/search-synonyms', variables),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchSynonymKeys.list() });
    },
  });
}

interface DeleteSearchSynonymVariables {
  /** 그룹 전체를 지울 때 사용 */
  groupKey?: string;
  /** 단어 하나만 지울 때 사용 */
  termId?: string;
}

/** @description 별칭 그룹 전체 또는 단어 하나를 삭제한다. */
export function useDeleteSearchSynonymMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupKey, termId }: DeleteSearchSynonymVariables) => {
      const params = new URLSearchParams();
      if (termId) params.set('termId', termId);
      else if (groupKey) params.set('groupKey', groupKey);

      return apiClient.delete(`/api/search-synonyms?${params.toString()}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchSynonymKeys.list() });
    },
  });
}

/**
 * @description 검색 별칭을 기본 시드 상태로 되돌린다.
 * 직접 추가한 별칭까지 모두 삭제되므로 호출부에서 확인 절차를 거친다.
 */
export function useResetSearchSynonymsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post<number>('/api/search-synonyms/reset', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchSynonymKeys.list() });
    },
  });
}
