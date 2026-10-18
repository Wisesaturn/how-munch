import { type NextRequest } from 'next/server';

import { type SupabaseClient } from '@supabase/supabase-js';

import { createClient } from '@/commons/api/supabase/server';
import { createTokenClient } from '@/commons/api/supabase/token';
import { type Database } from '@/commons/model/types';
import { apiResponse } from '@/commons/lib/http/apiResponse';
import { parseBearerToken } from '@/commons/lib/http/bearerToken';

export type AuthContext = {
  userId: string;
  supabase: SupabaseClient<Database>;
};

/**
 * @description Route Handler를 인증으로 감싸는 HOF.
 * supabase.auth.getUser() 검증 후 userId + supabase 클라이언트를 핸들러에 주입한다.
 * `Authorization: Bearer` 토큰이 있으면 토큰으로(.ait 원격 호출), 없으면 쿠키 세션으로(web) 인증한다.
 * 두 경우 모두 사용자 권한으로 요청하므로 RLS가 자동 적용된다.
 */
export function withAuth(handler: (req: NextRequest, ctx: AuthContext) => Promise<Response>) {
  return async (req: NextRequest): Promise<Response> => {
    const accessToken = parseBearerToken(req.headers.get('authorization'));
    const supabase = accessToken ? createTokenClient(accessToken) : await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken ?? undefined);
    if (error || !user) return apiResponse.UNAUTHORIZED();
    return handler(req, { userId: user.id, supabase });
  };
}
