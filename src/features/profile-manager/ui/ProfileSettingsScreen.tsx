'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';

import { stackFlowActions } from '@/apps/stackflow/StackFlow';

import { ScrollArea } from '@/commons/ui';

import { DeleteAccountButton } from './DeleteAccountButton';
import { LogoutButton } from './LogoutButton';
import { SettingsActionRow } from './SettingsActionRow';

export function ProfileSettingsScreen() {
  return (
    <AppScreen className="pointer-events-auto" appBar={{ title: '설정' }}>
      <ScrollArea className="h-full">
        <div className="space-y-2 p-4">
          <h2 className="px-1 text-xs font-semibold text-gray-500">프로필</h2>
          <SettingsActionRow
            label="프로필 수정"
            onClick={() => stackFlowActions.push('ProfileEditActivity', {})}
          />

          <h2 className="px-1 text-xs font-semibold text-gray-500">계정</h2>
          <LogoutButton />
          <DeleteAccountButton />
        </div>
      </ScrollArea>
    </AppScreen>
  );
}
