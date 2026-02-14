import { BottomNav } from '@/modules/bottom-nav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="safe-area-bottom [--safe-area-bottom-offset:5rem]">{children}</main>
      <BottomNav />
    </>
  );
}
