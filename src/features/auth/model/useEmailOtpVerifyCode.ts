'use client';

import { useRef } from 'react';

import { useRouter } from 'next/navigation';

import { Toast } from '@/commons/ui';

import { useVerifyEmailOtpMutation } from '../api/mutations';

import { useEmailOtpFormContext } from './EmailOtpFormContext';

interface UseEmailOtpVerifyCodeOptions {
  hasOtpExpired: boolean;
  onCodeReset: () => void;
}

export function useEmailOtpVerifyCode({
  hasOtpExpired,
  onCodeReset,
}: UseEmailOtpVerifyCodeOptions) {
  const router = useRouter();
  const otpInputRef = useRef<HTMLInputElement>(null);
  const { sentEmail } = useEmailOtpFormContext('useEmailOtpVerifyCode');
  const verifyEmailOtpMutation = useVerifyEmailOtpMutation();

  function focusOtpInput() {
    requestAnimationFrame(() => {
      otpInputRef.current?.focus();
    });
  }

  function verifyCode(nextCode: string) {
    if (!sentEmail) return;
    if (verifyEmailOtpMutation.isPending || nextCode.length !== 6) return;
    if (hasOtpExpired) {
      onCodeReset();
      Toast.error('유효시간이 만료되었습니다. 인증번호를 재전송해 주세요');
      return;
    }

    verifyEmailOtpMutation.mutate(
      { email: sentEmail, code: nextCode },
      {
        onSuccess: () => {
          Toast.success('로그인되었습니다');
          router.replace('/meal');
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : '인증번호 확인에 실패했습니다';
          onCodeReset();
          focusOtpInput();
          Toast.error(message);
        },
      },
    );
  }

  return {
    otpInputRef,
    verifyCode,
    isVerifyingCode: verifyEmailOtpMutation.isPending,
  };
}
