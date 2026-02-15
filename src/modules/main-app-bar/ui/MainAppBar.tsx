'use client';

import { type ReactNode } from 'react';

import { cn } from '@/commons/lib';

interface MainAppBarProps {
  title: string;
  right?: ReactNode;
  className?: string;
}

export function MainAppBar({ title, right, className }: MainAppBarProps) {
  const handleTitleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 -mx-4 border-b border-gray-100 bg-white/95 [padding-top:calc(constant(safe-area-inset-top))] [padding-top:calc(env(safe-area-inset-top))] backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex h-12 items-center justify-between gap-3 px-4">
        <button
          type="button"
          onClick={handleTitleClick}
          className="min-w-0 truncate text-left text-[20px] leading-7 font-semibold text-gray-900"
          aria-label={`${title} 상단으로 이동`}
        >
          {title}
        </button>
        <div className="flex shrink-0 items-center justify-end">{right}</div>
      </div>
    </header>
  );
}
