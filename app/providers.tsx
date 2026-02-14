'use client';

import { useState, type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { OverlayProvider } from 'overlay-kit';

import { ToastViewport } from '@/commons/ui';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <OverlayProvider>
        {children}
        <ToastViewport />
        <ReactQueryDevtools initialIsOpen={false} />
      </OverlayProvider>
    </QueryClientProvider>
  );
}
