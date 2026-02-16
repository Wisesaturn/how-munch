declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }

  function serve(handler: (request: Request) => Response | Promise<Response>): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2.49.1' {
  interface RpcResult<T> {
    data: T | null;
    error: { message: string } | null;
  }

  interface SupabaseClientLike {
    rpc: <T = unknown>(fn: string, args?: Record<string, unknown>) => Promise<RpcResult<T>>;
  }

  export function createClient(url: string, key: string): SupabaseClientLike;
}

declare module 'npm:web-push' {
  interface WebPushSubscription {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  interface WebPushError extends Error {
    statusCode?: number;
    body?: string;
  }

  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  export function sendNotification(
    subscription: WebPushSubscription,
    payload?: string,
  ): Promise<void>;
  export type { WebPushError, WebPushSubscription };
}
