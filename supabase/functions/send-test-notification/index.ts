import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { sendNotification, setVapidDetails } from 'npm:web-push';

// 역할: 특정 유저에게 테스트 push 알림을 즉시 발송한다.
// 동작: Authorization 헤더로 서비스 롤 검증 → 활성 구독 조회 → web-push 발송

Deno.serve(async (request: Request) => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT');
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

  if (!supabaseUrl || !serviceRoleKey || !vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
    return new Response(JSON.stringify({ error: 'Missing env variables' }), { status: 500 });
  }

  const { userId } = await request.json();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: subscription, error } = await supabase
    .from('notification_push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  if (!subscription) {
    return new Response(JSON.stringify({ error: 'No active subscription' }), { status: 404 });
  }

  setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  await sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify({ title: '테스트 알림 🔔', body: '푸시 알림이 정상적으로 동작합니다!' }),
  );

  return new Response(null, { status: 204 });
});
