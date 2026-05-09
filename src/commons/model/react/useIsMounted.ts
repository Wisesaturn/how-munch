import { useRef, useEffect } from 'react';

/**
 * @description 컴포넌트가 마운트됐는지 여부를 ref로 추적하는 훅입니다.
 * 비동기 작업 완료 후 언마운트된 컴포넌트에 상태 업데이트를 방지하는 데 사용합니다.
 */
export function useIsMounted() {
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return isMountedRef;
}
