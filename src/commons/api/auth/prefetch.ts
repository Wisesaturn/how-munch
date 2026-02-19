import { type QueryClient } from '@tanstack/react-query';
import { type User } from '@supabase/supabase-js';

import { createClient } from '../supabase/server';

import { authQueryKeys } from './queryKey';

const AUTH_USER_STALE_TIME = 5 * 60 * 1000;
const AUTH_USER_GC_TIME = 30 * 60 * 1000;

/**
 * @description 서버에서 현재 로그인 사용자를 prefetch하고 React Query 캐시에 주입합니다.
 */
export async function prefetchAuthUser(queryClient: QueryClient): Promise<User | null> {
  return queryClient.fetchQuery({
    queryKey: authQueryKeys.user(),
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        if (error.message === 'Auth session missing!') {
          return null;
        }
        throw error;
      }

      return data.user;
    },
    staleTime: AUTH_USER_STALE_TIME,
    gcTime: AUTH_USER_GC_TIME,
  });
}
