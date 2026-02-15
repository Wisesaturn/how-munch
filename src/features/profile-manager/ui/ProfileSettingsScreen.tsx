'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { ChevronLeft } from 'lucide-react';

import { stackFlowActions } from '@/apps/stackflow/StackFlow';

import { ScrollArea } from '@/commons/ui';

import { DeleteAccountButton } from './DeleteAccountButton';
import { LogoutButton } from './LogoutButton';
import { SettingsActionRow } from './SettingsActionRow';

interface ProfileSettingsScreenProps {
  onClose: () => void;
}

export function ProfileSettingsScreen({ onClose }: ProfileSettingsScreenProps) {
  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: '설정',
        backButton: {
          render: () => (
            <button type="button" onClick={onClose} aria-label="뒤로가기" className="p-1">
              <ChevronLeft className="size-5" />
            </button>
          ),
        },
      }}
    >
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
