'use client';

import { EmailOtpFormContextProvider, useEmailOtpFormContext } from '../model/EmailOtpFormContext';

import { EmailOtpRequestStep } from './EmailOtpRequestStep';
import { EmailOtpVerificationStep } from './EmailOtpVerificationStep';

function EmailOtpFormContent() {
  const { sentEmail } = useEmailOtpFormContext('EmailOtpFormContent');

  return (
    <div className="w-full max-w-[320px] space-y-4">
      {!sentEmail ? <EmailOtpRequestStep /> : <EmailOtpVerificationStep />}
    </div>
  );
}

export function EmailOtpForm() {
  return (
    <EmailOtpFormContextProvider>
      <EmailOtpFormContent />
    </EmailOtpFormContextProvider>
  );
}
