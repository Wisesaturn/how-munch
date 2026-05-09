import { useCallback, useMemo, useState } from 'react';

import { useIsMounted } from './useIsMounted';

/**
 * @description Promise 로딩 상태를 추적하는 훅입니다.
 * 비동기 작업 진행 여부를 loading 플래그로 관리하며,
 * 언마운트 후 setState 호출을 방지합니다.
 *
 * @reference https://github.com/toss/react-simplikit/blob/main/src/hooks/useLoading/useLoading.ts
 */
export function useLoading(): [boolean, <T>(promise: Promise<T>) => Promise<T>] {
  const [loading, setLoading] = useState(false);
  const isMountedRef = useIsMounted();

  const startTransition = useCallback(
    async <T>(promise: Promise<T>) => {
      try {
        setLoading(true);
        return await promise;
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [isMountedRef],
  );

  return useMemo(() => [loading, startTransition], [loading, startTransition]);
}
