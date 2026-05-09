import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { sendNotification, setVapidDetails, type WebPushError } from 'npm:web-push';

// 역할: 특정 유저에게 테스트 push 알림을 즉시 발송한다.
// 동작: 유저 JWT 검증 → 서비스 롤로 활성 구독 조회 → web-push 발송 (만료 시 비활성화)

function isExpiredSubscription(error: unknown) {
  const statusCode = (error as WebPushError)?.statusCode;
  return statusCode === 404 || statusCode === 410;
}

Deno.serve(async (request: Request) => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT');
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

  if (
    !supabaseUrl ||
    !anonKey ||
    !serviceRoleKey ||
    !vapidSubject ||
    !vapidPublicKey ||
    !vapidPrivateKey
  ) {
    return new Response(JSON.stringify({ error: 'Missing env variables' }), { status: 500 });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { userId } = await request.json();
  if (!userId || userId !== user.id) {
    return new Response(JSON.stringify({ error: 'userId mismatch' }), { status: 403 });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: subscription, error } = await serviceClient
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

  try {
    await sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify({ title: '테스트 알림 🔔', body: '푸시 알림이 정상적으로 동작합니다!' }),
    );
  } catch (sendError) {
    if (isExpiredSubscription(sendError)) {
      await serviceClient.rpc('deactivate_push_subscription_by_endpoint', {
        p_endpoint: subscription.endpoint,
      });
      return new Response(JSON.stringify({ error: 'Subscription expired' }), { status: 410 });
    }
    return new Response(JSON.stringify({ error: 'Failed to send notification' }), { status: 500 });
  }

  return new Response(null, { status: 204 });
});
