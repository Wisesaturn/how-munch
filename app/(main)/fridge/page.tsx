import { redirect } from 'next/navigation';

import { createClient } from '@/commons/api/supabase/server';

import { FridgePage } from '@/pages/fridge';

export default async function FridgeRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  await supabase.rpc('ensure_current_user_household_member');

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

  return <FridgePage householdId={householdId} />;
}
