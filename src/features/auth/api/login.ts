'use server';

import { redirect } from 'next/navigation';

import { createClient } from '@/commons/api/supabase/server';

export async function loginWithKakao() {
  const supabase = await createClient();
  const origin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

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
