'use client';

import { type ReactNode, useEffect } from 'react';

import { StackFlowStack, stackFlowActions } from '@/apps/stackflow/StackFlow';

function getActiveActivity() {
  return stackFlowActions.getStack().activities.find((activity) => activity.isActive) ?? null;
}

// HACK: 일부 브라우저/디바이스에서 history-sync popstate 동기화가 누락되는 케이스를 보완하기 위해
// popstate 직후 활성 Activity가 변경되지 않았을 때만 안전 fallback(pop)으로 닫습니다.
function useStackFlowPopstateFallback() {
  useEffect(() => {
    const handlePopState = () => {
      const beforeActive = getActiveActivity();
      if (!beforeActive || beforeActive.isRoot) return;

      window.setTimeout(() => {
        const afterActive = getActiveActivity();
        if (!afterActive || afterActive.isRoot) return;

        // history-sync가 popstate를 처리하지 못한 경우에만 안전하게 fallback pop 처리
        if (afterActive.id === beforeActive.id) {
          stackFlowActions.pop();
        }
      }, 0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
}

export function StackFlowProvider({ children }: { children: ReactNode }) {
  useStackFlowPopstateFallback();

  return (
    <>
      {children}
      <StackFlowStack />
    </>
  );
}
