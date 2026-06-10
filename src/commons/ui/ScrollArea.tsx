'use client';

import * as React from 'react';

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';

import { cn } from '../lib';

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/
interface ScrollAreaProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  showScrollBar?: boolean;
}

const ScrollArea = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(({ className, children, showScrollBar = false, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn('relative overflow-hidden', className)}
    {...props}
  >
    {/* [&>div]:block! — Radix Viewport 내부 래퍼(display:table; min-width:100%)가 자식의
        max-content 너비(nowrap 텍스트, 가로 스크롤 행 등)만큼 부풀어 레이아웃을 밀어내는 문제 교정.
        세로 스크롤 전용이므로 block으로 강제해도 스크롤 측정에 영향 없음.
        @see https://github.com/radix-ui/primitives/issues/2722
        @see https://github.com/radix-ui/primitives/issues/3646 */}
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] [&>div]:block! [&>div]:min-w-0!">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar className={!showScrollBar ? 'pointer-events-none opacity-0' : undefined} />
    <ScrollAreaPrimitive.Corner className={!showScrollBar ? 'opacity-0' : undefined} />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

/* -------------------------------------------------------------------------------------------------
 * ScrollBar
 * -----------------------------------------------------------------------------------------------*/
const ScrollBar = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      'flex touch-none transition-colors select-none',
      orientation === 'vertical' && 'h-full w-2.5 border-l border-l-transparent p-px',
      orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent p-px',
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="bg-border relative flex-1 rounded-full" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
