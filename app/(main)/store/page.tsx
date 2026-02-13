import { redirect } from 'next/navigation';

import { createClient } from '@/commons/api/supabase/server';

import { StorePage } from '@/pages/store';

export default async function StoreRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // TODO: 실제 household_id는 프로필에서 조회 (가구 기능 구현 후)
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('user_id', user.id)
    .single();

  const householdId = profile?.household_id;

  if (!householdId) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-5 py-12">
        <p className="text-sm text-gray-500">가구에 가입되어 있지 않습니다</p>
        <p className="text-xs text-gray-400">프로필에서 가구를 생성하거나 초대를 받아 주세요</p>
      </div>
    );
  }

  return <StorePage householdId={householdId} userId={user.id} />;
}
