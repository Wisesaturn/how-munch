import { redirect } from 'next/navigation';

import { createClient } from '@/commons/api/supabase/server';

import { LoginEmailPage } from '@/pages/login-email';

export default async function LoginEmailRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/meal');
  }

  return <LoginEmailPage />;
}
