'use client';

import { createClient } from '@/commons/api/supabase/client';

/**
 * 카카오 OAuth 로그인 화면으로 이동합니다.
 * 브라우저 클라이언트가 PKCE code verifier를 쿠키에 저장하고, /auth/callback에서 세션으로 교환합니다.
 */
export async function loginWithKakao() {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}
