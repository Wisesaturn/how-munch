'use client';

import { formatSecondsToTimer } from '@/commons/lib/time';
import { OTP } from '@/commons/ui';

import { useEmailOtpFormContext } from '../model/EmailOtpFormContext';
import { useEmailOtpResendCode } from '../model/useEmailOtpResendCode';
import { useEmailOtpVerifyCode } from '../model/useEmailOtpVerifyCode';
import { useOtpCodeState } from '../model/useOtpCodeState';
import { useOtpCountdown } from '../model/useOtpCountdown';

export function EmailOtpVerificationStep() {
  const { sentEmail } = useEmailOtpFormContext('EmailOtpVerificationStep');
  const { code, setCode, resetCode } = useOtpCodeState();
  const active = Boolean(sentEmail);

  const {
    remainingOtpSeconds,
    hasOtpExpired,
    restart: restartOtpCountdown,
  } = useOtpCountdown({
    active,
    onExpired: resetCode,
  });

  const { otpInputRef, verifyCode, isVerifyingCode } = useEmailOtpVerifyCode({
    hasOtpExpired,
    onCodeReset: resetCode,
  });

  const { resendCode, isResendingCode } = useEmailOtpResendCode({
    onResent: () => {
      resetCode();
      restartOtpCountdown();
    },
  });

  const isSubmittingOtp = isVerifyingCode || isResendingCode;

  if (!sentEmail) return null;

  return (
    <div className="space-y-3">
      {!hasOtpExpired ? (
        <p className="text-center text-xs text-gray-500">
          인증번호 유효시간 {formatSecondsToTimer(remainingOtpSeconds)}
        </p>
      ) : (
        <p className="text-center text-xs font-medium text-red-500">유효시간이 만료되었습니다</p>
      )}

      <div className="flex justify-center">
        <OTP.Root
          ref={otpInputRef}
          maxLength={6}
          value={code}
          autoFocus
          inputMode="numeric"
          size="lg"
          onChange={setCode}
          onComplete={(completedCode) => {
            setCode(completedCode);
            verifyCode(completedCode);
          }}
          disabled={isSubmittingOtp}
        >
          <OTP.Slot index={0} />
          <OTP.Slot index={1} />
          <OTP.Slot index={2} />
          <OTP.Slot index={3} />
          <OTP.Slot index={4} />
          <OTP.Slot index={5} />
        </OTP.Root>
      </div>

      <p className="text-center text-xs text-gray-500">
        인증번호를 받지 못하셨나요?{' '}
        <button
          type="button"
          className="font-medium text-emerald-600 disabled:text-gray-400"
          onClick={resendCode}
          disabled={isSubmittingOtp}
        >
          재전송
        </button>
      </p>
    </div>
  );
}
