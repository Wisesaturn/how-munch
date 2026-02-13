import { redirect } from 'next/navigation';

import { createClient } from '@/commons/api/supabase/server';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  return (
    <div className="flex flex-col gap-6 px-5 py-6">
      <header>
        <h1 className="text-xl font-bold">프로필</h1>
      </header>
      <p className="text-sm text-gray-400">준비 중입니다</p>
    </div>
  );
}
