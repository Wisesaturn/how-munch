'use client';

import { useMutation } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';

import { normalizeEmail } from '../lib/normalizeEmail';

export function useRequestEmailOtpMutation() {
  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) {
        throw new Error('이메일을 입력해 주세요');
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({ email: normalizedEmail });
      if (error) throw new Error(error.message);
    },
  });
}

export function useVerifyEmailOtpMutation() {
  return useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      const normalizedEmail = normalizeEmail(email);
      const normalizedCode = code.trim();
      if (!normalizedEmail) {
        throw new Error('이메일을 입력해 주세요');
      }
      if (!normalizedCode) {
        throw new Error('인증번호를 입력해 주세요');
      }

      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: normalizedCode,
        type: 'email',
      });

      if (error) throw new Error(error.message);
    },
  });
}
