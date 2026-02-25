import { skipToken, useQuery } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';

import {
  householdKeys,
  type Household,
  type HouseholdMember,
  type HouseholdMemberWithProfile,
} from '@/entities/household';

/** 가구 정보 조회 */
export function useHouseholdQuery(householdId: string | null) {
  return useQuery({
    queryKey: householdKeys.detail(householdId ?? ''),
    queryFn: householdId
      ? async () => {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('households')
            .select('*')
            .eq('id', householdId)
            .single();

          if (error) throw error;
          return data as Household;
        }
      : skipToken,
  });
}

/** 가구 멤버 목록 조회 */
export function useMembersQuery(householdId: string | null) {
  return useQuery({
    queryKey: householdKeys.members(householdId ?? ''),
    queryFn: householdId
      ? async () => {
          const supabase = createClient();

          const { data: members, error: membersError } = await supabase
            .from('household_members')
            .select('*')
            .eq('household_id', householdId)
            .order('created_at', { ascending: true });

          if (membersError) throw membersError;

          const typedMembers = (members ?? []) as HouseholdMember[];
          if (typedMembers.length === 0) return [] as HouseholdMemberWithProfile[];

          const userIds = typedMembers.map((member) => member.user_id);
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, nickname, email')
            .in('user_id', userIds);

          if (profilesError) throw profilesError;

          const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));

          return typedMembers.map((member) => {
            const profile = profileMap.get(member.user_id);
            return {
              ...member,
              nickname: profile?.nickname ?? '알 수 없음',
              email: profile?.email ?? '-',
            };
          }) as HouseholdMemberWithProfile[];
        }
      : skipToken,
  });
}
