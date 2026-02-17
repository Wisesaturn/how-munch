import { addDays } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';
import { uuid } from '@/commons/lib';
import { type Database } from '@/commons/types';

import { type HouseholdInvite } from '@/entities/household';

import { householdKeys } from './queryKey';

type HouseholdInsert = Database['public']['Tables']['households']['Insert'];
type HouseholdMembersInsert = Database['public']['Tables']['household_members']['Insert'];
type HouseholdInviteInsert = Database['public']['Tables']['household_invites']['Insert'];

function createInviteCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/** 가구 생성 */
export function useCreateHouseholdMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, userId }: { name: string; userId: string }) => {
      const supabase = createClient();
      const householdId = uuid();

      const householdInput: HouseholdInsert = { id: householdId, name };
      const { error: householdError } = await supabase.from('households').insert(householdInput);

      if (householdError) throw householdError;

      const memberInput: HouseholdMembersInsert = {
        household_id: householdId,
        user_id: userId,
        role: 'owner',
      };

      const { error: memberError } = await supabase.from('household_members').insert(memberInput);
      if (memberError) throw memberError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ household_id: householdId, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      return householdId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: householdKeys.all });
    },
  });
}

/** 초대 코드로 가입 */
export function useJoinHouseholdMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code }: { code: string }) => {
      const supabase = createClient();
      const normalizedCode = code.trim().toUpperCase();

      const { data, error } = await supabase.rpc('join_household', {
        invite_code: normalizedCode,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: householdKeys.all });
    },
  });
}

/** 가구 탈퇴 */
export function useLeaveHouseholdMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ householdId, userId }: { householdId: string; userId: string }) => {
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('household_members')
        .delete()
        .eq('household_id', householdId)
        .eq('user_id', userId);
      if (deleteError) throw deleteError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ household_id: null, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: householdKeys.all });
    },
  });
}

/** 초대 코드 생성 */
export function useCreateInviteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ householdId, userId }: { householdId: string; userId: string }) => {
      const supabase = createClient();
      const nowIso = new Date().toISOString();

      // 유효 기간 내 + 사용 가능 횟수가 남은 기존 초대 링크를 우선 재사용
      const { data: existingInvites, error: existingError } = await supabase
        .from('household_invites')
        .select('*')
        .eq('household_id', householdId)
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false });

      if (existingError) throw existingError;

      const reusableInvite = (existingInvites ?? []).find(
        (invite) => invite.use_count < invite.max_uses,
      );
      if (reusableInvite) {
        return { invite: reusableInvite as HouseholdInvite, reused: true };
      }

      const input: HouseholdInviteInsert = {
        household_id: householdId,
        created_by: userId,
        code: createInviteCode(6),
        expires_at: addDays(new Date(), 7).toISOString(),
        max_uses: 10,
      };

      const { data, error } = await supabase
        .from('household_invites')
        .insert(input)
        .select('*')
        .single();

      if (error) throw error;
      return { invite: data as HouseholdInvite, reused: false };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: householdKeys.invites(variables.householdId) });
    },
  });
}
