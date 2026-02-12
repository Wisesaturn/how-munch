'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createClient } from '@/commons/api/supabase/server';

export async function loginWithKakao() {
  const supabase = await createClient();
  const headerStore = await headers();
  const origin = headerStore.get('origin') ?? 'http://localhost:3000';

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
