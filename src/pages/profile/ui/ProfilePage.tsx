'use client';

import { useRouter } from 'next/navigation';

import { overlay } from 'overlay-kit';

import { Button } from '@/commons/ui';

import {
  CreateHouseholdBottomSheet,
  InviteLinkSection,
  JoinHouseholdBottomSheet,
  MemberList,
  useHouseholdQuery,
  useMembersQuery,
} from '@/features/household-manager';
import { useProfileQuery } from '@/features/profile-manager';

interface ProfilePageProps {
  userId: string;
  householdId: string | null;
}

export function ProfilePage({ userId, householdId }: ProfilePageProps) {
  const router = useRouter();

  const { data: profile, isLoading: isProfileLoading } = useProfileQuery(userId);
  const { data: household } = useHouseholdQuery(householdId);
  const { data: members = [] } = useMembersQuery(householdId);

  const createOverlayCloseHandler = (close: () => void, unmount: () => void) => {
    close();
    window.setTimeout(unmount, 200);
  };

  const openCreateHouseholdSheet = () => {
    overlay.open(({ isOpen, close, unmount }) => (
      <CreateHouseholdBottomSheet
        open={isOpen}
        onClose={() => createOverlayCloseHandler(close, unmount)}
        userId={userId}
        onCreated={() => router.refresh()}
      />
    ));
  };

  const openJoinHouseholdSheet = () => {
    overlay.open(({ isOpen, close, unmount }) => (
      <JoinHouseholdBottomSheet
        open={isOpen}
        onClose={() => createOverlayCloseHandler(close, unmount)}
        onJoined={() => router.refresh()}
      />
    ));
  };

  return (
    <div className="flex flex-col gap-4 px-4 pb-5">
      {isProfileLoading || !profile ? (
        <div className="py-6 text-center text-sm text-gray-400">불러오는 중...</div>
      ) : (
        <section className="space-y-1 px-1 pt-1">
          <h2 className="text-xl font-semibold text-gray-900">{profile.nickname}</h2>
          <h3 className="text-sm font-medium text-gray-500">{profile.email}</h3>
        </section>
      )}

      {!householdId ? (
        <div className="rounded-xl border border-gray-100 bg-white">
          <div className="px-4 pt-4">
            <h2 className="text-sm font-semibold">가구 관리</h2>
          </div>
          <div className="flex flex-col gap-2 p-4">
            <p className="text-xs text-gray-500">
              아직 가구에 가입되어 있지 않습니다. 가구를 생성하거나 초대 코드를 입력해 가입해
              주세요.
            </p>
            <Button variant="default" color="primary" onClick={openCreateHouseholdSheet}>
              가구 생성
            </Button>
            <Button variant="outline" onClick={openJoinHouseholdSheet}>
              초대 코드로 가입
            </Button>
          </div>
        </div>
      ) : (
        <>
          {household && (
            <InviteLinkSection
              household={household}
              memberCount={members.length}
              householdId={householdId}
              userId={userId}
              onLeft={() => router.refresh()}
            />
          )}
          <MemberList members={members} />
        </>
      )}
    </div>
  );
}
