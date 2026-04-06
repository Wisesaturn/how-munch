import { skipToken, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';

import {
  householdKeys,
  type Household,
  type HouseholdMemberWithProfile,
} from '@/entities/household';

/** 가구 정보 조회 */
export function useHouseholdQuery(householdId: string | null) {
  return useQuery({
    queryKey: householdKeys.detail(householdId ?? ''),
    queryFn: householdId
      ? () => apiClient.get<Household>('/api/households', { id: householdId })
      : skipToken,
  });
}

/** 가구 멤버 목록 조회 */
export function useMembersQuery(householdId: string | null) {
  return useQuery({
    queryKey: householdKeys.members(householdId ?? ''),
    queryFn: householdId
      ? () =>
          apiClient.get<HouseholdMemberWithProfile[]>('/api/households/members', { householdId })
      : skipToken,
  });
}
