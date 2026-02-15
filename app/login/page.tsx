import { redirect } from 'next/navigation';

import { createClient } from '@/commons/api/supabase/server';

import { LoginPage } from '@/pages/login';

export default async function LoginRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/meal');
  }

  return <LoginPage />;
}
