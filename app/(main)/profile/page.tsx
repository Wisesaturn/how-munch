import { redirect } from 'next/navigation';

import { createClient } from '@/commons/api/supabase/server';

import { ProfilePage } from '@/pages/profile';

export default async function ProfileRoute() {
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

  return <ProfilePage userId={user.id} householdId={profile?.household_id ?? null} />;
}
