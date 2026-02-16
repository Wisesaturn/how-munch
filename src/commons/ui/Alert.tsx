'use client';

import * as React from 'react';

import { Bell } from 'lucide-react';

import { cn } from '../lib';

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/
interface AlertProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  hasUnread?: boolean;
  unreadCount?: number;
}

function Alert({ hasUnread = false, unreadCount = 0, className, ...props }: AlertProps) {
  const shouldShowBadge = hasUnread || unreadCount > 0;
  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <span
      data-slot="alert"
      data-has-unread={hasUnread ? 'true' : 'false'}
      className={cn(
        'relative inline-flex size-5 items-center justify-center text-gray-700',
        className,
      )}
      {...props}
    >
      <Bell className="size-5" />
      {shouldShowBadge ? (
        <span
          className="absolute -top-1 -right-2 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-4 font-semibold text-white"
          aria-label={`읽지 않은 알림 ${badgeText}개`}
        >
          {badgeText}
        </span>
      ) : null}
    </span>
  );
}

Alert.displayName = 'Alert';

export { Alert };
