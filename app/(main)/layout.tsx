import { MainRouteAppBar } from '@/apps/main-route-app-bar';

import { BottomNav } from '@/modules/bottom-nav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MainRouteAppBar />
      <main className="safe-area-padding-bottom-with-nav pt-4">{children}</main>
      <BottomNav />
    </>
  );
}
