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

  const normalizedCode = code.toUpperCase();

  const { data: invite } = await supabase
    .from('household_invites')
    .select('household_id')
    .eq('code', normalizedCode)
    .maybeSingle();

  const { data: validInvite } = await supabase
    .from('household_invites')
    .select('id')
    .eq('code', normalizedCode)
    .gt('expires_at', 'now()')
    .filter('use_count', 'lt', 'max_uses')
    .maybeSingle();

  const isValid = !!validInvite;

  let householdName: string | null = null;
  if (invite?.household_id) {
    const { data: household } = await supabase
      .from('households')
      .select('name')
      .eq('id', invite.household_id)
      .maybeSingle();

    householdName = household?.name ?? null;
  }

  return <InvitePage code={normalizedCode} householdName={householdName} isValid={isValid} />;
}
