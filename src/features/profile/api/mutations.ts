import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';
import { createClient } from '@/commons/api/supabase/client';

import { profileKeys } from '@/entities/profile';

/** 프로필 수정 (닉네임) */
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ nickname }: { userId: string; nickname: string }) =>
      apiClient.put('/api/profile', { nickname }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(variables.userId) });
    },
  });
}

/** 로그아웃 */
export function useLogoutMutation() {
  return useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      window.location.href = '/';
    },
  });
}

/** 회원 탈퇴 */
export function useDeleteAccountMutation() {
  return useMutation({
    mutationFn: async () => {
      await apiClient.delete('/api/profile');
      window.location.href = '/';
    },
  });
}
