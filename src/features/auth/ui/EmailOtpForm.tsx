'use client';

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react';

import { useRouter } from 'next/navigation';

import { useCountdown } from 'usehooks-ts';

import { EMAIL_OTP_EXPIRES_IN_SECONDS } from '@/commons/config';
import { formatSecondsToTimer } from '@/commons/lib/time';
import { Button, Input, OTP, Toast } from '@/commons/ui';

import { loginWithEmailOtp, verifyEmailOtp } from '../api/login';

export function EmailOtpForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [code, setCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isPending, startTransition] = useTransition();
  const hasShownExpiredNoticeRef = useRef(false);
  const [remainingSeconds, { resetCountdown, startCountdown, stopCountdown }] = useCountdown({
    countStart: EMAIL_OTP_EXPIRES_IN_SECONDS,
    countStop: 0,
    intervalMs: 1000,
    isIncrement: false,
  });

  const sendCode = (nextEmail: string) => {
    startTransition(async () => {
      try {
        await loginWithEmailOtp(nextEmail);
        setSentEmail(nextEmail);
        setIsCodeSent(true);
        setCode('');
        hasShownExpiredNoticeRef.current = false;
        resetCountdown();
        startCountdown();
        Toast.success('인증번호를 보냈어요. 메일함에서 확인해 입력해 주세요');
      } catch (error) {
        const message = error instanceof Error ? error.message : '인증번호 전송에 실패했습니다';
        Toast.error(message);
      }
    });
  };

  useEffect(() => {
    if (!isCodeSent) {
      stopCountdown();
      hasShownExpiredNoticeRef.current = false;
      return;
    }

    if (remainingSeconds > 0) return;
    if (hasShownExpiredNoticeRef.current) return;
    hasShownExpiredNoticeRef.current = true;
    Toast.error('유효시간이 만료되었습니다. 인증번호를 재전송해 주세요');
  }, [isCodeSent, remainingSeconds, stopCountdown]);

  const handleSendCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      Toast.error('이메일을 입력해 주세요');
      return;
    }
    sendCode(normalizedEmail);
  };

  const verifyCode = (nextCode: string) => {
    if (isPending || nextCode.length !== 6) return;
    if (remainingSeconds <= 0) {
      setCode('');
      Toast.error('유효시간이 만료되었습니다. 인증번호를 재전송해 주세요');
      return;
    }
    const verifyEmail = sentEmail || email.trim().toLowerCase();

    startTransition(async () => {
      try {
        await verifyEmailOtp(verifyEmail, nextCode);
        Toast.success('로그인되었습니다');
        router.replace('/meal');
      } catch (error) {
        const message = error instanceof Error ? error.message : '인증번호 확인에 실패했습니다';
        setCode('');
        Toast.error(message);
      }
    });
  };

  const handleResend = () => {
    if (isPending || !sentEmail) return;
    sendCode(sentEmail);
  };

  return (
    <div className="w-full max-w-[320px] space-y-4">
      {!isCodeSent && (
        <form onSubmit={handleSendCode} className="space-y-2">
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Button type="submit" variant="outline" className="w-full" disabled={isPending}>
            {isPending ? '전송 중...' : '인증번호 받기'}
          </Button>
        </form>
      )}

      {isCodeSent && (
        <div className="space-y-3">
          {remainingSeconds > 0 ? (
            <p className="text-center text-xs text-gray-500">
              인증번호 유효시간 {formatSecondsToTimer(remainingSeconds)}
            </p>
          ) : (
            <p className="text-center text-xs font-medium text-red-500">
              유효시간이 만료되었습니다
            </p>
          )}
          <div className="flex justify-center">
            <OTP.Root
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
              disabled={isPending}
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
              onClick={handleResend}
              disabled={isPending}
            >
              재전송
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
