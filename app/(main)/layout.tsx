import { BottomNav } from '@/modules/bottom-nav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="safe-area-padding-bottom">{children}</main>
      <BottomNav />
    </>
  );
}
