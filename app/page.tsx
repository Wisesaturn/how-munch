'use client';

import { useAuthRedirect } from '@/features/auth';

export default function HomePage() {
  useAuthRedirect({ authenticatedPath: '/meal', unauthenticatedPath: '/login' });

  return null;
}
