'use client';

import { useState, type ReactNode } from 'react';

import { createSafeContext } from '@/commons/lib/context';

interface EmailOtpFormContextValue {
  sentEmail: string | null;
  setOtpEmail: (email: string) => void;
  clearSentEmail: () => void;
}

const [EmailOtpFormContextProviderInternal, useEmailOtpFormContext] =
  createSafeContext<EmailOtpFormContextValue>('EmailOtpFormContext');

export function EmailOtpFormContextProvider({ children }: { children: ReactNode }) {
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  function setOtpEmail(email: string) {
    setSentEmail(email);
  }

  function clearSentEmail() {
    setSentEmail(null);
  }

  return (
    <EmailOtpFormContextProviderInternal
      sentEmail={sentEmail}
      setOtpEmail={setOtpEmail}
      clearSentEmail={clearSentEmail}
    >
      {children}
    </EmailOtpFormContextProviderInternal>
  );
}

export { useEmailOtpFormContext };
