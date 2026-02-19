import { redirect } from 'next/navigation';

import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';

import { MainRouteAppBar } from '@/apps/app-bar';
import { prefetchHydration } from '@/apps/hydration/lib';
import { NotificationPermissionSync } from '@/apps/providers/NotificationPermissionSync';

import { ScrollArea } from '@/commons/ui';

import { BottomNav } from '@/modules/bottom-nav';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
  const { user } = await prefetchHydration(queryClient);

  if (!user) {
    redirect('/login');
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex h-dvh flex-col">
        <NotificationPermissionSync />
        <MainRouteAppBar />
        <main className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="safe-area-padding-bottom-with-nav pt-4">{children}</div>
          </ScrollArea>
        </main>
        <BottomNav />
      </div>
    </HydrationBoundary>
  );
}
