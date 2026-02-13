import { BottomNav } from '@/modules/bottom-nav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="pb-20">{children}</main>
      <BottomNav />
    </>
  );
}
