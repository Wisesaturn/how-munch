'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';

import { DeleteAccountButton } from './DeleteAccountButton';
import { LogoutButton } from './LogoutButton';

export function ProfileSettingsScreen() {
  return (
    <AppScreen className="pointer-events-auto" appBar={{ title: '설정' }}>
      <div className="space-y-2 p-4">
        <h2 className="px-1 text-xs font-semibold text-gray-500">계정</h2>

        <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
          <LogoutButton />
          <DeleteAccountButton />
        </div>
      </div>
    </AppScreen>
  );
}
