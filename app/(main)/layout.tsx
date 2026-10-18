'use client';

import { MainRouteAppBar } from '@/apps/app-bar';
import { NotificationPermissionSync } from '@/apps/providers/NotificationPermissionSync';

import { ScrollArea } from '@/commons/ui';

import { useAuthRedirect } from '@/features/auth';

import { BottomNav } from '@/modules/bottom-nav';

import MainLoading from './loading';

/**
 * 로그인 확인은 클라이언트에서 한다. 정적 빌드(.ait)에서는 서버 redirect/prefetch를 쓸 수 없다.
 * 로그인 사용자가 필요한 영역(useUserSuspenseQuery)은 확인이 끝난 뒤 그린다
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { isChecking } = useAuthRedirect({ unauthenticatedPath: '/login' });

  return (
    <div className="flex h-dvh flex-col">
      {!isChecking && (
        <>
          <NotificationPermissionSync />
          <MainRouteAppBar />
        </>
      )}
      <main className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div className="safe-area-padding-bottom-with-nav pt-4">
            {isChecking ? <MainLoading /> : children}
          </div>
        </ScrollArea>
      </main>
      <BottomNav />
    </div>
  );
}
