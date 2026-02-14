'use client';

import { basicUIPlugin } from '@stackflow/plugin-basic-ui';
import { basicRendererPlugin } from '@stackflow/plugin-renderer-basic';
import { stackflow } from '@stackflow/react';

function IdleActivity() {
  return null;
}

function PlaceholderActivity() {
  return null;
}

const appStackFlow = stackflow({
  transitionDuration: 240,
  initialActivity: () => 'IdleActivity',
  activities: {
    IdleActivity,
    PlaceholderActivity,
  },
  plugins: [
    basicRendererPlugin(),
    basicUIPlugin({
      theme: 'cupertino',
    }),
  ],
});

export const { Stack: StackFlowStack, useFlow: useStackFlow } = appStackFlow;
