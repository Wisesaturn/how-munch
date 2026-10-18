'use client';

import { useAuthRedirect } from '@/features/auth';

import { LoginPage } from '@/pages/login';

export default function LoginRoute() {
  const { isChecking } = useAuthRedirect({ authenticatedPath: '/meal' });

  if (isChecking) return null;

  return <LoginPage />;
}
