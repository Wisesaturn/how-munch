import { skipToken, useQuery, useSuspenseQuery } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';

import { type Profile } from '@/entities/profile';

import { profileKeys } from './queryKey';

/** 내 프로필 조회 */
export function useProfileQuery(userId: string | null) {
  return useQuery({
    queryKey: profileKeys.detail(userId ?? ''),
    queryFn: userId
      ? async () => {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (error) throw error;
          return data as Profile;
        }
      : skipToken,
  });
}

/** 내 프로필 조회 (Suspense) */
export function useProfileSuspenseQuery(userId: string) {
  return useSuspenseQuery({
    queryKey: profileKeys.detail(userId ?? ''),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data as Profile;
    },
  });
}
