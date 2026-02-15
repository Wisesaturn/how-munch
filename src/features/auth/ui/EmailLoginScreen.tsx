'use client';

import { useState, useTransition, type FormEvent } from 'react';

import { useRouter } from 'next/navigation';

import { AppScreen } from '@stackflow/plugin-basic-ui';

import { Button, Input, ScrollArea, Toast } from '@/commons/ui';

import { loginWithEmailOtp, verifyEmailOtp } from '../api/login';

interface EmailLoginScreenProps {
  onClose: () => void;
}

export function EmailLoginScreen({ onClose }: EmailLoginScreenProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [isPending, startTransition] = useTransition();
  let sendCodeButtonLabel = '인증번호 받기';
  if (isPending) sendCodeButtonLabel = '전송 중...';
  else if (isCodeSent) sendCodeButtonLabel = '인증번호 재전송';

  const handleSendCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    startTransition(async () => {
      try {
        await loginWithEmailOtp(email);
        setIsCodeSent(true);
        setSentEmail(email.trim().toLowerCase());
        Toast.success('인증번호를 보냈어요. 메일에서 확인해 입력해 주세요');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '이메일 로그인 요청에 실패했습니다';
        Toast.error(message);
      }
    });
  };

  const handleVerifyCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    startTransition(async () => {
      try {
        await verifyEmailOtp(sentEmail || email, code);
        Toast.success('로그인되었습니다');
        onClose();
        router.replace('/meal');
      } catch (error) {
        const message = error instanceof Error ? error.message : '인증번호 확인에 실패했습니다';
        Toast.error(message);
      }
    });
  };

  return (
    <AppScreen className="pointer-events-auto" appBar={{ title: '이메일 로그인' }}>
      <ScrollArea className="h-full">
        <form onSubmit={handleSendCode} className="flex flex-col gap-4 p-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">이메일</span>
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isCodeSent}
            />
          </label>
          <Button type="submit" disabled={isPending}>
            {sendCodeButtonLabel}
          </Button>
        </form>

        {isCodeSent && (
          <form onSubmit={handleVerifyCode} className="flex flex-col gap-4 px-4 pb-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">인증번호</span>
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="메일로 받은 인증번호 입력"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
              />
            </label>
            <Button type="submit" disabled={isPending}>
              {isPending ? '확인 중...' : '인증번호 확인하고 로그인'}
            </Button>
          </form>
        )}
      </ScrollArea>
    </AppScreen>
  );
}
