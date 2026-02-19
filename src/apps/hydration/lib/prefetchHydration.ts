import { type QueryClient } from '@tanstack/react-query';
import { type User } from '@supabase/supabase-js';

import { prefetchAuthUser } from '@/commons/api/auth/prefetch';

interface PrefetchHydrationResult {
  user: User | null;
}

/**
 * @description 앱 초기 Hydration에 필요한 서버 prefetch를 병렬로 수행합니다.
 */
export async function prefetchHydration(
  queryClient: QueryClient,
): Promise<PrefetchHydrationResult> {
  const [user] = await Promise.all([prefetchAuthUser(queryClient)]);

  return { user };
}
