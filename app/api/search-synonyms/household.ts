import { type AuthContext } from '@/apps/route';

/**
 * @description 세션 사용자의 가구 id를 조회한다.
 * 검색 별칭은 가구 단위 데이터이므로 클라이언트가 보낸 householdId를 신뢰하지 않고
 * 항상 서버에서 프로필을 통해 해석한다.
 */
export async function resolveCurrentHouseholdId(
  supabase: AuthContext['supabase'],
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.household_id ?? null;
}
