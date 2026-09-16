import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { sendNotification, setVapidDetails, type WebPushError } from 'npm:web-push';

// 역할: 가구 이벤트(냉장고 추가, 식단 등록, 외식/배달 등록, 예산 초과) 발생 시 해당 가구 멤버에게 push 알림을 발송한다.
// 동작:
// 1. 호출자 JWT 검증 (user 클라이언트로 getUser)
// 2. 요청 바디에서 householdId, triggeredBy, type, title, body, payload 수신
// 3. household_members에서 멤버 목록 조회 (예산 초과는 유발자 포함 — 돈을 쓴 사람도 초과 사실을 알아야 한다)
// 4. 각 멤버의 notification_preferences에서 해당 type의 토글 확인 (off이면 스킵)
// 5. 활성 push 구독 조회 → sendNotification 발송
// 6. 만료 구독(404/410) → deactivate 처리
// 7. 항상 200 반환 (fire-and-forget — 발송 실패가 메인 저장 흐름을 블로킹하지 않음)

type NotificationType =
  | 'fridge_item_added'
  | 'meal_added'
  | 'dining_expense_added'
  | 'budget_exceeded';

const PREFERENCE_KEY: Record<NotificationType, string> = {
  fridge_item_added: 'fridge_item_added_enabled',
  meal_added: 'meal_added_enabled',
  dining_expense_added: 'dining_expense_added_enabled',
  budget_exceeded: 'budget_exceeded_enabled',
};

interface RequestBody {
  householdId: string;
  triggeredBy: string;
  type: NotificationType;
  title: string;
  body: string;
}

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

  // JWT 검증
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

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const { householdId, triggeredBy, type, title, body: notificationBody } = body;
  if (!householdId || !triggeredBy || !type || !title || !notificationBody) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  const preferenceKey = PREFERENCE_KEY[type];
  if (!preferenceKey) {
    return new Response(JSON.stringify({ error: 'Unsupported notification type' }), {
      status: 400,
    });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  // 가구 멤버 목록 조회. 활동 알림은 유발자를 제외하지만, 예산 초과는 유발자도 받아야 한다.
  const membersQuery = serviceClient
    .from('household_members')
    .select('user_id')
    .eq('household_id', householdId);

  const { data: members, error: membersError } =
    type === 'budget_exceeded'
      ? await membersQuery
      : await membersQuery.neq('user_id', triggeredBy);

  if (membersError || !members || members.length === 0) {
    return new Response(JSON.stringify({ dispatched: 0 }), { status: 200 });
  }

  const memberIds = members.map((m) => m.user_id);

  // 알림 토글이 활성화된 멤버만 필터
  const { data: preferences } = await serviceClient
    .from('notification_preferences')
    .select(`user_id, ${preferenceKey}`)
    .in('user_id', memberIds)
    .eq(preferenceKey, true);

  const enabledUserIds = new Set((preferences ?? []).map((p) => p.user_id));
  if (enabledUserIds.size === 0) {
    return new Response(JSON.stringify({ dispatched: 0 }), { status: 200 });
  }

  // 활성 push 구독 조회
  const { data: subscriptions } = await serviceClient
    .from('notification_push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', Array.from(enabledUserIds))
    .eq('is_active', true);

  if (!subscriptions || subscriptions.length === 0) {
    return new Response(JSON.stringify({ dispatched: 0 }), { status: 200 });
  }

  setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const payload = JSON.stringify({ title, body: notificationBody });
  let dispatched = 0;

  for (const sub of subscriptions) {
    try {
      await sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      dispatched++;
    } catch (sendError) {
      if (isExpiredSubscription(sendError)) {
        await serviceClient.rpc('deactivate_push_subscription_by_endpoint', {
          p_endpoint: sub.endpoint,
        });
      }
    }
  }

  return new Response(JSON.stringify({ dispatched }), { status: 200 });
});
