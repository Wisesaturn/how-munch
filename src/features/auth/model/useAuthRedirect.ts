'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQueryClient } from '@tanstack/react-query';
import { useAsyncEffect } from 'react-simplikit';

import { authQueryKeys } from '@/commons/api/auth/queryKey';
import { createClient } from '@/commons/api/supabase/client';

interface UseAuthRedirectOptions {
  /** 로그인 상태일 때 이동할 경로 */
  authenticatedPath?: string;
  /** 로그아웃 상태일 때 이동할 경로 */
  unauthenticatedPath?: string;
}

/**
 * @description 클라이언트에서 Supabase 세션을 확인해 로그인 상태에 맞는 경로로 이동합니다.
 * 정적 빌드(.ait)에서는 서버 redirect를 쓸 수 없어 화면 진입 후 확인합니다.
 * 이동할 경로가 없으면 확인이 끝난 뒤 isChecking이 false가 됩니다.
 * 확인한 사용자는 auth user 쿼리 캐시에 넣어 useUserSuspenseQuery가 다시 조회하지 않게 합니다.
 */
export function useAuthRedirect({
  authenticatedPath,
  unauthenticatedPath,
}: UseAuthRedirectOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isChecking, setIsChecking] = useState(true);

  useAsyncEffect(
    async function redirectBySession() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) queryClient.setQueryData(authQueryKeys.user(), user);

      const nextPath = user ? authenticatedPath : unauthenticatedPath;
      if (nextPath) {
        router.replace(nextPath);
        return;
      }

      setIsChecking(false);
    },
    [authenticatedPath, unauthenticatedPath, router, queryClient],
  );

  return { isChecking };
}
