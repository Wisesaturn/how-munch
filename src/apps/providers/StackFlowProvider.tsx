'use client';

import { type ReactNode } from 'react';

import { StackFlowStack } from '@/apps/stackflow/StackFlow';

export function StackFlowProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <StackFlowStack />
    </>
  );
}
