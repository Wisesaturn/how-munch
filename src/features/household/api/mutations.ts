import { addDays } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';
import { type Database } from '@/commons/types';

import { householdKeys, type HouseholdInvite } from '@/entities/household';

type HouseholdInviteInsert = Database['public']['Tables']['household_invites']['Insert'];

function createInviteCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/** 가구 생성 */
export function useCreateHouseholdMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name }: { name: string; userId: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('create_household_with_owner', {
        p_name: name,
      });
      if (error) throw error;
      return data;
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
    mutationFn: async ({ householdId }: { householdId: string; userId: string }) => {
      const supabase = createClient();
      const { error } = await supabase.rpc('leave_household', {
        p_household_id: householdId,
      });
      if (error) throw error;
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
