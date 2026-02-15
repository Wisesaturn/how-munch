'use client';

import { Toast } from '@/commons/ui';

import { useRequestEmailOtpMutation } from '../api/mutations';
import { normalizeEmail } from '../lib/normalizeEmail';

import { useEmailOtpFormContext } from './EmailOtpFormContext';

export function useEmailOtpRequestCode() {
  const { setOtpEmail } = useEmailOtpFormContext('useEmailOtpRequestCode');
  const requestEmailOtpMutation = useRequestEmailOtpMutation();

  function requestCode(email: string) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      Toast.error('이메일을 입력해 주세요');
      return;
    }

    requestEmailOtpMutation.mutate(
      { email: normalizedEmail },
      {
        onSuccess: () => {
          Toast.success('인증번호를 보냈어요. 메일함에서 확인해 입력해 주세요');
          setOtpEmail(normalizedEmail);
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : '인증번호 전송에 실패했습니다';
          Toast.error(message);
        },
      },
    );
  }

  return {
    requestCode,
    isRequestingCode: requestEmailOtpMutation.isPending,
  };
}
