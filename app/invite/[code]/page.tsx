import { redirect } from 'next/navigation';

import { createClient } from '@/commons/api/supabase/server';

import { InvitePage } from '@/pages/invite';

interface InviteRouteProps {
  params: Promise<{ code: string }>;
}

export default async function InviteRoute({ params }: InviteRouteProps) {
  const { code } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const normalizedCode = code.trim().toUpperCase();
  await supabase.rpc('ensure_current_user_household_member');

  const { data } = await supabase.rpc('get_invite_household', {
    invite_code: normalizedCode,
  });

  const invite = Array.isArray(data) ? data[0] : null;
  const householdName = invite?.household_name ?? null;
  const isValid = invite?.is_valid ?? false;

  return <InvitePage code={normalizedCode} householdName={householdName} isValid={isValid} />;
}
