'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { CalendarDays, Package, Snowflake, User } from 'lucide-react';

import { cn } from '@/commons/lib';

const NAV_ITEMS = [
  { href: '/store', label: '장보기', icon: Package },
  { href: '/fridge', label: '냉장고', icon: Snowflake },
  { href: '/meal', label: '식단', icon: CalendarDays },
  { href: '/profile', label: '프로필', icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-area-padding-bottom fixed right-0 bottom-0 left-0 z-50 border-t border-gray-100 bg-white/95 pt-1 backdrop-blur-sm">
      <div className="mx-auto w-full md:max-w-[430px]">
        <ul className="flex items-center justify-around">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname?.startsWith(href) ?? false;

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex flex-col items-center gap-1 px-4 py-2 text-xs transition-colors',
                    isActive ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600',
                  )}
                >
                  <Icon className="size-5" strokeWidth={isActive ? 2.2 : 1.8} />
                  <span className={cn('text-[11px]', isActive && 'font-semibold')}>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
