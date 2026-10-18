import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { type Database } from '../../model/types';

/**
 * @description Authorization 헤더의 access token으로 요청하는 서버용 Supabase 클라이언트.
 * 쿠키가 없는 원격 호출(.ait → Vercel API)에서 쓴다. 토큰을 헤더로 실어 보내므로 RLS가 그대로 적용된다.
 * 요청마다 만들고 세션을 저장하거나 갱신하지 않는다(갱신은 토큰을 보낸 클라이언트가 한다)
 */
export function createTokenClient(accessToken: string) {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
}
