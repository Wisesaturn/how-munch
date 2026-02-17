import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  sendNotification,
  setVapidDetails,
  type WebPushError,
  type WebPushSubscription,
} from 'npm:web-push';

interface PendingPushNotification {
  notification_id: string;
  user_id: string;
  title: string;
  description: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected error';
}

function isDeactivateTarget(error: unknown) {
  const webPushError = error as WebPushError;
  return webPushError?.statusCode === 404 || webPushError?.statusCode === 410;
}

Deno.serve(async (request: Request) => {
  try {
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (cronSecret) {
      const providedSecret = request.headers.get('x-cron-secret');
      if (!providedSecret || providedSecret !== cronSecret) {
        return new Response(JSON.stringify({ error: 'Invalid cron secret' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase environment variables' }), {
        status: 500,
      });
    }

    const vapidSubject = Deno.env.get('VAPID_SUBJECT');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: 'Missing VAPID environment variables' }), {
        status: 500,
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const { data, error } = await supabase.rpc('generate_expiry_soon_notifications');

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const pendingResult = await supabase.rpc<PendingPushNotification[]>(
      'get_pending_push_notifications',
      { p_limit: 200 },
    );
    if (pendingResult.error) {
      return new Response(JSON.stringify({ error: pendingResult.error.message }), { status: 500 });
    }

    const pendingNotifications = pendingResult.data ?? [];
    const sentNotificationIds = new Set<string>();

    for (const notification of pendingNotifications) {
      const subscription: WebPushSubscription = {
        endpoint: notification.endpoint,
        keys: {
          p256dh: notification.p256dh,
          auth: notification.auth,
        },
      };

      try {
        await sendNotification(
          subscription,
          JSON.stringify({
            title: notification.title,
            body: notification.description,
            data: { notificationId: notification.notification_id },
          }),
        );
        sentNotificationIds.add(notification.notification_id);
      } catch (sendError) {
        if (isDeactivateTarget(sendError)) {
          await supabase.rpc('deactivate_push_subscription_by_endpoint', {
            p_endpoint: notification.endpoint,
          });
        }
      }
    }

    if (sentNotificationIds.size > 0) {
      await supabase.rpc('mark_notifications_push_sent', {
        p_ids: Array.from(sentNotificationIds),
      });
    }

    return new Response(
      JSON.stringify({
        insertedCount: data ?? 0,
        pushDispatchedCount: sentNotificationIds.size,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: getErrorMessage(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
});
