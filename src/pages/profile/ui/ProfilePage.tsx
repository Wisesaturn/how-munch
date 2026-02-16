'use client';

import { useRouter } from 'next/navigation';

import { Home, Sparkles, WandSparkles } from 'lucide-react';
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

  const profileInitial = profile?.nickname?.trim().charAt(0).toUpperCase() ?? '?';

  return (
    <div className="flex flex-col gap-4 px-4 pb-5">
      {isProfileLoading || !profile ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center text-sm text-gray-400 shadow-sm">
          불러오는 중...
        </div>
      ) : (
        <section className="flex items-center justify-between gap-3 px-1 pt-1">
          <div className="min-w-0 flex-1 px-3 py-2">
            <h2 className="truncate text-xl font-semibold text-gray-900">{profile.nickname}</h2>
            <p className="truncate text-sm font-medium text-gray-500">{profile.email}</p>
          </div>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-semibold text-white shadow-sm">
            {profileInitial}
          </div>
        </section>
      )}

      {!householdId ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-gray-800">
            <Home className="size-4" />
            <h2 className="text-sm font-semibold">가구 시작하기</h2>
          </div>
          <div className="space-y-3">
            <p className="text-sm leading-5 text-gray-600">
              아직 가구에 가입되어 있지 않습니다. 가구를 생성하거나 초대 코드를 입력해 가입해
              주세요.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button variant="default" onClick={openCreateHouseholdSheet}>
                <Sparkles className="size-4" />
                가구 생성
              </Button>
              <Button variant="outline" onClick={openJoinHouseholdSheet}>
                <WandSparkles className="size-4" />
                초대 코드로 가입
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          {household && (
            <section>
              <InviteLinkSection
                household={household}
                householdId={householdId}
                userId={userId}
                onLeft={() => router.refresh()}
              />
            </section>
          )}
          <section>
            <MemberList members={members} />
          </section>
        </div>
      )}
    </div>
  );
}
