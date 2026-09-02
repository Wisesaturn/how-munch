import { type NextRequest } from 'next/server';

import { withAuth } from '@/apps/route';

import { resolveDomainError } from '@/commons/lib';
import { apiResponse } from '@/commons/lib/http/apiResponse';

import { resolveCurrentHouseholdId } from './household';

/** GET /api/search-synonyms — 내 가구의 유사어 전체 조회 */
export const GET = withAuth(async (_req: NextRequest, { userId, supabase }) => {
  const householdId = await resolveCurrentHouseholdId(supabase, userId);
  if (!householdId) return apiResponse.OK([]);

  const { data, error } = await supabase
    .from('search_synonym_terms')
    .select('id, group_key, term, created_at')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true });

  if (error) return apiResponse.INTERNAL_ERROR();
  return apiResponse.OK(data);
});

/** POST /api/search-synonyms — 검색어와 입력 단어들을 하나의 유사어 그룹으로 연결 */
export const POST = withAuth(async (req: NextRequest, { userId, supabase }) => {
  const { baseTerm, terms } = await req.json();

  if (typeof baseTerm !== 'string' || !Array.isArray(terms)) {
    return apiResponse.BAD_REQUEST('CMN_002', 'baseTerm과 terms가 필요합니다.');
  }

  const householdId = await resolveCurrentHouseholdId(supabase, userId);
  if (!householdId) return apiResponse.BAD_REQUEST('CMN_002', '가구 정보를 찾을 수 없습니다.');

  const { data, error } = await supabase.rpc('upsert_search_synonym_guarded', {
    p_household_id: householdId,
    p_base_term: baseTerm,
    p_terms: terms,
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.OK(data);
});

/** DELETE /api/search-synonyms?groupKey= 또는 ?termId= — 유사어 그룹 또는 단어 하나 삭제 */
export const DELETE = withAuth(async (req: NextRequest, { userId, supabase }) => {
  const { searchParams } = req.nextUrl;
  const groupKey = searchParams.get('groupKey');
  const termId = searchParams.get('termId');

  if (!groupKey && !termId) {
    return apiResponse.BAD_REQUEST('CMN_002', 'groupKey 또는 termId가 필요합니다.');
  }

  const householdId = await resolveCurrentHouseholdId(supabase, userId);
  if (!householdId) return apiResponse.BAD_REQUEST('CMN_002', '가구 정보를 찾을 수 없습니다.');

  const query = supabase.from('search_synonym_terms').delete().eq('household_id', householdId);
  const { error } = termId ? await query.eq('id', termId) : await query.eq('group_key', groupKey!);

  if (error) return apiResponse.INTERNAL_ERROR();
  return apiResponse.NO_CONTENT();
});
