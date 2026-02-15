'use client';

import { useState } from 'react';

import { Button, Input } from '@/commons/ui';

import { normalizeEmail } from '../lib/normalizeEmail';
import { useEmailOtpRequestCode } from '../model/useEmailOtpRequestCode';

export function EmailOtpRequestStep() {
  const [emailInput, setEmailInput] = useState('');
  const { requestCode, isRequestingCode } = useEmailOtpRequestCode();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        requestCode(normalizeEmail(emailInput));
      }}
      className="space-y-2"
    >
      <Input
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={emailInput}
        onChange={(event) => setEmailInput(event.target.value)}
        required
      />
      <Button type="submit" variant="outline" className="w-full" disabled={isRequestingCode}>
        {isRequestingCode ? '전송 중...' : '인증번호 받기'}
      </Button>
    </form>
  );
}
