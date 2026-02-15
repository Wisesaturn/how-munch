'use client';

import { useRef } from 'react';

import { useConditionalEffect } from 'react-simplikit';
import { useCountdown } from 'usehooks-ts';

import { EMAIL_OTP_EXPIRES_IN_SECONDS } from '@/commons/config';
import { Toast } from '@/commons/ui';

interface UseOtpCountdownOptions {
  active: boolean;
  onExpired?: () => void;
}

export function useOtpCountdown({ active, onExpired }: UseOtpCountdownOptions) {
  const hasShownExpiredNoticeRef = useRef(false);
  const [remainingOtpSeconds, { resetCountdown, startCountdown, stopCountdown }] = useCountdown({
    countStart: EMAIL_OTP_EXPIRES_IN_SECONDS,
    countStop: 0,
    intervalMs: 1000,
    isIncrement: false,
  });

  useConditionalEffect(
    function syncCountdownWithActiveState() {
      if (active) {
        hasShownExpiredNoticeRef.current = false;
        resetCountdown();
        startCountdown();
        return;
      }
      hasShownExpiredNoticeRef.current = false;
      stopCountdown();
    },
    [active] as const,
    (prevDeps, currentDeps) => {
      const currentActive = currentDeps[0];
      const previousActive = prevDeps?.[0];
      return currentActive !== previousActive;
    },
  );

  useConditionalEffect(
    function notifyOtpExpiredOnce() {
      if (hasShownExpiredNoticeRef.current) return;
      hasShownExpiredNoticeRef.current = true;
      onExpired?.();
      Toast.error('유효시간이 만료되었습니다. 인증번호를 재전송해 주세요');
    },
    [active, remainingOtpSeconds] as const,
    (prevDeps, currentDeps) => {
      const currentActive = currentDeps[0];
      const currentRemainingOtpSeconds = currentDeps[1];
      const previousRemainingOtpSeconds = prevDeps?.[1];
      return (
        currentActive === true &&
        currentRemainingOtpSeconds === 0 &&
        previousRemainingOtpSeconds !== 0
      );
    },
  );

  const restart = () => {
    hasShownExpiredNoticeRef.current = false;
    resetCountdown();
    startCountdown();
  };

  return {
    remainingOtpSeconds,
    hasOtpExpired: remainingOtpSeconds <= 0,
    restart,
    stop: stopCountdown,
  };
}
