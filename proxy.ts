import { type NextRequest, NextResponse } from 'next/server';

import { updateSession } from '@/commons/api/supabase/middleware';
import { getApiCorsHeaders } from '@/commons/lib/http/apiCors';

/**
 * @description /api/*: tossmini 출처(.ait 화면)에 CORS 헤더를 붙이고 preflight(OPTIONS)에 바로 답한다.
 * Bearer 토큰 요청은 쿠키 세션이 없으니 세션 갱신을 건너뛴다. 그 밖의 요청은 쿠키 세션을 갱신한다.
 */
export async function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return await updateSession(request);
  }

  const corsHeaders = getApiCorsHeaders(request.headers.get('origin'));

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders ?? undefined });
  }

  const response = request.headers.has('authorization')
    ? NextResponse.next({ request })
    : await updateSession(request);

  if (corsHeaders) {
    Object.entries(corsHeaders).forEach(([name, value]) => response.headers.set(name, value));
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
