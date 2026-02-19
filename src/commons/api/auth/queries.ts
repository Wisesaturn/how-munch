'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { createClient } from '../supabase/client';

import { authQueryKeys } from './queryKey';

/** 현재 로그인 사용자 조회 */
export function useUserSuspenseQuery() {
  return useSuspenseQuery({
    queryKey: authQueryKeys.user(),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error('사용자 정보를 불러오지 못했습니다');
      return data.user;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
