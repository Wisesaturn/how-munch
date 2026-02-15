'use client';

import { useRouter } from 'next/navigation';

import { overlay } from 'overlay-kit';

import { Button, Card, Toast } from '@/commons/ui';

import {
  CreateHouseholdBottomSheet,
  HouseholdInfo,
  InviteLinkSection,
  JoinHouseholdBottomSheet,
  LeaveHouseholdButton,
  MemberList,
  useHouseholdQuery,
  useMembersQuery,
} from '@/features/household-manager';
import { ProfileCard, ProfileEditBottomSheet, useProfileQuery } from '@/features/profile-manager';

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

  const openProfileEditSheet = () => {
    if (!profile) {
      Toast.error('프로필 정보를 불러오지 못했습니다');
      return;
    }

    overlay.open(({ isOpen, close, unmount }) => (
      <ProfileEditBottomSheet
        open={isOpen}
        onClose={() => createOverlayCloseHandler(close, unmount)}
        profile={profile}
      />
    ));
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
        <Card>
          <Card.Content className="py-6 text-center text-sm text-gray-400">
            불러오는 중...
          </Card.Content>
        </Card>
      ) : (
        <ProfileCard profile={profile} onEdit={openProfileEditSheet} />
      )}

      {!householdId ? (
        <Card>
          <Card.Header>
            <h2 className="text-sm font-semibold">가구 관리</h2>
          </Card.Header>
          <Card.Content className="flex flex-col gap-2">
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
          </Card.Content>
        </Card>
      ) : (
        <>
          {household && <HouseholdInfo household={household} memberCount={members.length} />}
          <MemberList members={members} />
          <InviteLinkSection householdId={householdId} userId={userId} />
          <LeaveHouseholdButton
            householdId={householdId}
            userId={userId}
            onLeft={() => router.refresh()}
          />
        </>
      )}
    </div>
  );
}
