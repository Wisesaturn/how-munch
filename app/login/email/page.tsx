'use client';

import { useAuthRedirect } from '@/features/auth';

import { LoginEmailPage } from '@/pages/login-email';

export default function LoginEmailRoute() {
  const { isChecking } = useAuthRedirect({ authenticatedPath: '/meal' });

  if (isChecking) return null;

  return <LoginEmailPage />;
}
