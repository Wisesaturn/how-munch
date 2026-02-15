import { LoginInfoGroup, LoginMethods } from '@/features/auth';

export function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4">
      <LoginInfoGroup title="How Munch" description="나의 식단을 기록하세요" />
      <LoginMethods />
    </main>
  );
}
