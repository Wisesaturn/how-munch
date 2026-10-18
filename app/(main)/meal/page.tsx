'use client';

import { useCurrentHouseholdIdQuery } from '@/entities/household';

import { MealPage } from '@/pages/meal';

import MainLoading from '../loading';

export default function MealRoute() {
  const { data: householdId, isPending } = useCurrentHouseholdIdQuery();

  if (isPending) {
    return <MainLoading />;
  }

  if (!householdId) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-5 py-12">
        <p className="text-sm text-gray-500">가구에 가입되어 있지 않습니다</p>
        <p className="text-xs text-gray-400">프로필에서 가구를 생성하거나 초대를 받아 주세요</p>
      </div>
    );
  }

  return <MealPage householdId={householdId} />;
}
