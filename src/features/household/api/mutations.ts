import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';

import { householdKeys, type HouseholdInvite } from '@/entities/household';

/** 가구 생성 */
export function useCreateHouseholdMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name }: { name: string; userId: string }) =>
      apiClient.post('/api/households', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: householdKeys.all });
    },
  });
}

/** 초대 코드로 가입 */
export function useJoinHouseholdMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code }: { code: string }) => apiClient.post('/api/households/join', { code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: householdKeys.all });
    },
  });
}

/** 가구 탈퇴 */
export function useLeaveHouseholdMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ householdId }: { householdId: string; userId: string }) =>
      apiClient.post('/api/households/leave', { householdId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: householdKeys.all });
    },
  });
}

/** 초대 코드 생성 */
export function useCreateInviteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ householdId }: { householdId: string; userId: string }) =>
      apiClient.post<{ invite: HouseholdInvite; reused: boolean }>('/api/households/invites', {
        householdId,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: householdKeys.invites(variables.householdId) });
    },
  });
}
