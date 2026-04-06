import { type NextRequest } from 'next/server';

// eslint-disable-next-line fsd/forbidden-imports
import { createClient } from '@/commons/api/supabase/server';

import { apiResponse } from './apiResponse';

export type AuthContext = {
  userId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

/**
 * @description Route Handler를 인증으로 감싸는 HOF.
 * supabase.auth.getUser() 검증 후 userId + supabase 클라이언트를 핸들러에 주입한다.
 * Supabase 서버 클라이언트가 쿠키 기반 세션을 복원하므로 RLS가 자동 적용된다.
 */
export function withAuth(handler: (req: NextRequest, ctx: AuthContext) => Promise<Response>) {
  return async (req: NextRequest): Promise<Response> => {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return apiResponse.UNAUTHORIZED();
    return handler(req, { userId: user.id, supabase });
  };
}
