import { redirect } from 'next/navigation';

import { createClient } from '@/commons/api/supabase/server';
import { KakaoLoginButton } from '@/features/auth';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/meal');
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold">How Munch</h1>
        <p className="text-sm text-gray-500">나의 식단을 기록하세요</p>
      </div>
      <div className="w-full max-w-[280px]">
        <KakaoLoginButton />
      </div>
    </main>
  );
}
