'use client';

import { usePathname } from 'next/navigation';

import { Search, Settings, SlidersHorizontal } from 'lucide-react';

import { stackFlowActions } from '@/apps/stackflow/StackFlow';

import { useUserSuspenseQuery } from '@/commons/api/auth/queries';
import { Alert, Button } from '@/commons/ui';

import { useProfileQuery } from '@/entities/profile';

import { useUnreadNotificationsCountQuery } from '@/features/notification';

import { MainAppBar } from '@/modules/main-app-bar';

function getMainTitle(pathname: string | null) {
  if (!pathname) return '';
  if (pathname.startsWith('/store')) return '장보기';
  if (pathname.startsWith('/fridge')) return '냉장고';
  if (pathname.startsWith('/meal')) return '식단';
  if (pathname.startsWith('/profile')) return '프로필';
  return '';
}

export function MainRouteAppBar() {
  const pathname = usePathname();
  const title = getMainTitle(pathname);
  const isProfile = pathname?.startsWith('/profile') ?? false;
  const isFridge = pathname?.startsWith('/fridge') ?? false;
  const isStore = pathname?.startsWith('/store') ?? false;
  const isMeal = pathname?.startsWith('/meal') ?? false;
  const { data: user } = useUserSuspenseQuery();
  const { data: unreadCount = 0 } = useUnreadNotificationsCountQuery(user.id);
  const { data: profile } = useProfileQuery(isStore ? user.id : null);

  if (!title) return null;

  if (isProfile) {
    return (
      <MainAppBar
        title={title}
        className="mx-0"
        right={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => stackFlowActions.push('ProfileSettingsActivity', {})}
            aria-label="설정 열기"
          >
            <Settings className="size-5" />
          </Button>
        }
      />
    );
  }

  if (isStore) {
    return (
      <MainAppBar
        title={title}
        className="mx-0"
        right={
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => stackFlowActions.push('NotificationActivity', {})}
              aria-label="알림 열기"
            >
              <Alert hasUnread={unreadCount > 0} unreadCount={unreadCount} />
            </Button>
            {profile?.household_id && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  stackFlowActions.push('IngredientSearchActivity', {
                    householdId: profile.household_id!,
                  })
                }
                aria-label="장보기 검색"
              >
                <Search className="size-5" />
              </Button>
            )}
          </div>
        }
      />
    );
  }

  if (isMeal) {
    return (
      <MainAppBar
        title={title}
        className="mx-0"
        right={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => stackFlowActions.push('NotificationActivity', {})}
            aria-label="알림 열기"
          >
            <Alert hasUnread={unreadCount > 0} unreadCount={unreadCount} />
          </Button>
        }
      />
    );
  }

  if (isFridge) {
    return (
      <MainAppBar
        title={title}
        className="mx-0"
        right={
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => stackFlowActions.push('NotificationActivity', {})}
              aria-label="알림 열기"
            >
              <Alert hasUnread={unreadCount > 0} unreadCount={unreadCount} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => stackFlowActions.push('FridgeFilterSettingsActivity', {})}
              aria-label="냉장고 필터 설정 열기"
            >
              <SlidersHorizontal className="size-5" />
            </Button>
          </div>
        }
      />
    );
  }

  return <MainAppBar title={title} className="mx-0" />;
}
