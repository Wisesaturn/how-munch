import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';

import { profileKeys } from './queryKey';

/** 프로필 수정 (닉네임) */
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, nickname }: { userId: string; nickname: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({ nickname, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) throw error;
    },
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
