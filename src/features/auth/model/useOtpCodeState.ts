'use client';

import { useState } from 'react';

export function useOtpCodeState() {
  const [code, setCode] = useState('');

  function resetCode() {
    setCode('');
  }

  return {
    code,
    setCode,
    resetCode,
  };
}
