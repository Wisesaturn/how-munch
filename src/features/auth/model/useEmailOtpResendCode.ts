'use client';

import { Toast } from '@/commons/ui';

import { useRequestEmailOtpMutation } from '../api/mutations';

import { useEmailOtpFormContext } from './EmailOtpFormContext';

interface UseEmailOtpResendCodeOptions {
  onResent: () => void;
}

export function useEmailOtpResendCode({ onResent }: UseEmailOtpResendCodeOptions) {
  const { sentEmail } = useEmailOtpFormContext('useEmailOtpResendCode');
  const requestEmailOtpMutation = useRequestEmailOtpMutation();

  function resendCode() {
    if (!sentEmail) return;
    if (requestEmailOtpMutation.isPending) return;

    requestEmailOtpMutation.mutate(
      { email: sentEmail },
      {
        onSuccess: () => {
          onResent();
          Toast.success('인증번호를 다시 보냈어요');
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : '인증번호 전송에 실패했습니다';
          Toast.error(message);
        },
      },
    );
  }

  return {
    resendCode,
    isResendingCode: requestEmailOtpMutation.isPending,
  };
}
