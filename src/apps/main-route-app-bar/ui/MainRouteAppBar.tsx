'use client';

import { usePathname } from 'next/navigation';

import { Settings } from 'lucide-react';

import { stackFlowActions } from '@/apps/stackflow/StackFlow';

import { Button } from '@/commons/ui';

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

  if (!title) return null;

  return (
    <MainAppBar
      title={title}
      className="mx-0"
      right={
        isProfile ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => stackFlowActions.push('ProfileSettingsActivity', {})}
            aria-label="설정 열기"
          >
            <Settings className="size-5" />
          </Button>
        ) : null
      }
    />
  );
}
