'use client';

import { useMemo, useState } from 'react';

import { Copy } from 'lucide-react';

import { Button, Card, Toast } from '@/commons/ui';

import { useCreateInviteMutation } from '../api/mutations';

interface InviteLinkSectionProps {
  householdId: string;
  userId: string;
}

export function InviteLinkSection({ householdId, userId }: InviteLinkSectionProps) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const mutation = useCreateInviteMutation();

  const inviteLink = useMemo(() => {
    if (!inviteCode || typeof window === 'undefined') return null;
    return `${window.location.origin}/invite/${inviteCode}`;
  }, [inviteCode]);

  const handleCreate = () => {
    mutation.mutate(
      { householdId, userId },
      {
        onSuccess: (invite) => {
          setInviteCode(invite.code);
          Toast.success('초대 링크가 생성되었습니다');
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : '초대 링크 생성에 실패했습니다';
          Toast.error(message);
        },
      },
    );
  };

  const handleCopy = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      Toast.success('초대 링크를 복사했습니다');
    } catch {
      Toast.error('클립보드 복사에 실패했습니다');
    }
  };

  return (
    <Card>
      <Card.Header className="flex flex-row items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">초대 링크</h2>
        <Button variant="outline" size="sm" onClick={handleCreate} disabled={mutation.isPending}>
          {mutation.isPending ? '생성 중...' : '초대 링크 만들기'}
        </Button>
      </Card.Header>
      <Card.Content>
        {inviteLink ? (
          <div className="flex items-center gap-2">
            <p className="flex-1 truncate rounded-md bg-gray-50 px-2 py-2 text-xs text-gray-600">
              {inviteLink}
            </p>
            <Button variant="outline" size="icon-sm" onClick={handleCopy}>
              <Copy className="size-4" />
            </Button>
          </div>
        ) : (
          <p className="text-xs text-gray-500">초대 링크를 생성하면 여기에서 복사할 수 있습니다.</p>
        )}
      </Card.Content>
    </Card>
  );
}
