'use client';

import { useState, useTransition, type FormEvent } from 'react';

import { useRouter } from 'next/navigation';

import { Button, Input, Toast } from '@/commons/ui';

import { loginWithEmailOtp, verifyEmailOtp } from '../api/login';

export function EmailOtpForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [code, setCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isPending, startTransition] = useTransition();
  let sendCodeButtonLabel = '인증번호 받기';
  if (isPending) sendCodeButtonLabel = '전송 중...';
  else if (isCodeSent) sendCodeButtonLabel = '인증번호 재전송';

  const sendCode = (nextEmail: string) => {
    startTransition(async () => {
      try {
        await loginWithEmailOtp(nextEmail);
        setSentEmail(nextEmail);
        setIsCodeSent(true);
        Toast.success('인증번호를 보냈어요. 메일함에서 확인해 입력해 주세요');
      } catch (error) {
        const message = error instanceof Error ? error.message : '인증번호 전송에 실패했습니다';
        Toast.error(message);
      }
    });
  };

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

  const handleVerifyCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const verifyEmail = sentEmail || email.trim().toLowerCase();

    startTransition(async () => {
      try {
        await verifyEmailOtp(verifyEmail, code);
        Toast.success('로그인되었습니다');
        router.replace('/meal');
      } catch (error) {
        const message = error instanceof Error ? error.message : '인증번호 확인에 실패했습니다';
        Toast.error(message);
      }
    });
  };

  return (
    <div className="w-full max-w-[320px] space-y-4">
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
          {sendCodeButtonLabel}
        </Button>
      </form>

      {isCodeSent && (
        <form onSubmit={handleVerifyCode} className="space-y-3">
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="인증번호 6자리 입력"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            maxLength={6}
            required
          />
          <Button
            type="submit"
            className="w-full"
            color="primary"
            disabled={isPending || code.length < 6}
          >
            {isPending ? '확인 중...' : '인증번호 확인'}
          </Button>
        </form>
      )}
    </div>
  );
}
