'use client';

import { useState, type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { OverlayProvider } from 'overlay-kit';

import { StackFlowProvider } from '@/apps/providers/StackFlowProvider';
import { ToastProvider } from '@/apps/providers/ToastProvider';

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
      <NuqsAdapter>
        <OverlayProvider>
          <StackFlowProvider>
            {children}
            <ToastProvider />
            <ReactQueryDevtools initialIsOpen={false} />
          </StackFlowProvider>
        </OverlayProvider>
      </NuqsAdapter>
    </QueryClientProvider>
  );
}
