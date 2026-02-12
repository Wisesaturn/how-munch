'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { createClient } from '@/commons/api/supabase/server';

export async function loginWithKakao() {
  const supabase = await createClient();
  const requestHeaders = await headers();
  const origin = requestHeaders.get('origin');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect(data.url);
}
