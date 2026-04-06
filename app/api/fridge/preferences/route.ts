import { type NextRequest } from 'next/server';

import { withAuth } from '@/apps/route';

import { apiResponse } from '@/commons/lib/http/apiResponse';

/** GET /api/fridge/preferences — 내 냉장고 표시 설정 조회 */
export const GET = withAuth(async (_req: NextRequest, { userId, supabase }) => {
  const { data, error } = await supabase
    .from('fridge_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return apiResponse.INTERNAL_ERROR();
  return apiResponse.OK(data);
});

/** PUT /api/fridge/preferences — 냉장고 표시 설정 저장 */
export const PUT = withAuth(async (req: NextRequest, { userId, supabase }) => {
  const body = await req.json();

  const { error } = await supabase.from('fridge_preferences').upsert({
    user_id: userId,
    ...body,
    updated_at: new Date().toISOString(),
  });

  if (error) return apiResponse.INTERNAL_ERROR();
  return apiResponse.NO_CONTENT();
});
