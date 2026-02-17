'use client';

import { useMemo, useState } from 'react';

import { Copy, LogOut, Mail, RotateCw } from 'lucide-react';

import { Button, Card, Toast } from '@/commons/ui';

import { type Household } from '@/entities/household';

import { useCreateInviteMutation, useLeaveHouseholdMutation } from '../api/mutations';

interface InviteLinkSectionProps {
  household: Household;
  householdId: string;
  userId: string;
  onLeft?: () => void;
}

export function InviteLinkSection({
  household,
  householdId,
  userId,
  onLeft,
}: InviteLinkSectionProps) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const inviteMutation = useCreateInviteMutation();
  const leaveMutation = useLeaveHouseholdMutation();

  const inviteLink = useMemo(() => {
    if (!inviteCode || typeof window === 'undefined') return null;
    return `${window.location.origin}/invite/${inviteCode}`;
  }, [inviteCode]);
  let inviteActionLabel = '초대 링크 생성';
  if (inviteMutation.isPending) inviteActionLabel = '확인 중...';
  else if (inviteLink) inviteActionLabel = '초대 링크 재확인';
  const InviteActionIcon = inviteLink ? RotateCw : Mail;

  const handleCreate = () => {
    inviteMutation.mutate(
      { householdId, userId },
      {
        onSuccess: ({ invite, reused }) => {
          setInviteCode(invite.code);
          Toast.success(reused ? '기존 초대 링크를 불러왔습니다' : '초대 링크가 생성되었습니다');
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : '초대 링크 생성에 실패했습니다';
          Toast.error(message);
        },
      },
    );
  };

  const handleLeave = () => {
    if (!window.confirm('가구에서 탈퇴하시겠습니까?')) return;

    leaveMutation.mutate(
      { householdId, userId },
      {
        onSuccess: () => {
          Toast.success('가구에서 탈퇴했습니다');
          onLeft?.();
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : '가구 탈퇴에 실패했습니다';
          Toast.error(message);
        },
      },
    );
  };

  const handleCopy = async () => {
    if (!inviteLink) return;

    const inviteText = [
      'How Munch 가구 초대 링크를 보냈어요.',
      '아래 링크를 열어 로그인 후 가구에 가입해 주세요.',
      inviteLink,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(inviteText);
      Toast.success('안내 문구와 초대 링크를 복사했습니다');
    } catch {
      Toast.error('클립보드 복사에 실패했습니다');
    }
  };

  return (
    <Card>
      <Card.Header className="flex flex-row items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">가구 정보</h2>
      </Card.Header>
      <Card.Content className="space-y-3">
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-medium">{household.name}</p>
          <p className="text-gray-500">초대 링크를 생성해 멤버를 초대할 수 있습니다.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={handleCreate}
            disabled={inviteMutation.isPending}
            className="w-full justify-center"
          >
            <InviteActionIcon className="size-4" />
            {inviteActionLabel}
          </Button>
          <Button
            variant="outline"
            onClick={handleLeave}
            disabled={leaveMutation.isPending}
            className="w-full justify-center border-red-200 text-red-600 hover:bg-red-50"
          >
            <LogOut className="size-4" />
            {leaveMutation.isPending ? '처리 중...' : '탈퇴하기'}
          </Button>
        </div>

        {inviteLink ? (
          <div className="space-y-2">
            <p className="truncate rounded-md border border-gray-200 bg-gray-50 px-2 py-2 text-xs text-gray-600">
              {inviteLink}
            </p>
            <Button variant="outline" onClick={handleCopy} className="w-full">
              <Copy className="size-4" />
              링크 복사
            </Button>
          </div>
        ) : null}
      </Card.Content>
    </Card>
  );
}
