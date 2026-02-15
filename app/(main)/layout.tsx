import { MainRouteAppBar } from '@/apps/main-route-app-bar';

import { ScrollArea } from '@/commons/ui';

import { BottomNav } from '@/modules/bottom-nav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col">
      <MainRouteAppBar />
      <main className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div className="safe-area-padding-bottom-with-nav pt-4">{children}</div>
        </ScrollArea>
      </main>
      <BottomNav />
    </div>
  );
}
