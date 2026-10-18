'use client';

import { useQuery } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';

import { householdKeys } from './queryKey';

/**
 * @description 로그인 사용자의 소속 가구 ID. 가구가 없으면 null.
 * 화면 진입 때 서버에서 하던 가구 멤버 보장(ensure_current_user_household_member)과 profile 조회를 클라이언트에서 한다.
 * 정적 빌드(.ait)는 서버 컴포넌트를 쓸 수 없어서다. 가구 생성/가입/탈퇴 뒤 householdKeys.all 무효화로 다시 조회된다
 */
export function useCurrentHouseholdIdQuery() {
  return useQuery({
    queryKey: householdKeys.current(),
    queryFn: async (): Promise<string | null> => {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) return null;

      await supabase.rpc('ensure_current_user_household_member');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;

      return profile.household_id;
    },
  });
}
