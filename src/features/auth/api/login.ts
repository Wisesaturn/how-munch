'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { createClient } from '@/commons/api/supabase/server';

export async function loginWithKakao() {
  const supabase = await createClient();
  const requestHeaders = await headers();
  const host =
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? 'localhost:3000';
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'http';
  const origin = `${protocol}://${host}`;

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

export async function loginWithEmailOtp(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('이메일을 입력해 주세요');
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function verifyEmailOtp(email: string, code: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = code.trim();
  if (!normalizedEmail) {
    throw new Error('이메일을 입력해 주세요');
  }
  if (!normalizedCode) {
    throw new Error('인증번호를 입력해 주세요');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: normalizedCode,
    type: 'email',
  });

  if (error) {
    throw new Error(error.message);
  }
}
