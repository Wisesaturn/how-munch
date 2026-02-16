import { AlertTriangle } from 'lucide-react';

import { cn } from '@/commons/lib';

import { type FridgeItemWithBatches } from '@/entities/fridge-item';

import { getDaysUntilExpiry } from '../lib/expiry';

interface ExpiryBannerProps {
  items: FridgeItemWithBatches[];
  className?: string;
}

interface ExpiryEntry {
  itemName: string;
  daysLeft: number;
}

/** 만료 임박/만료됨 요약 배너 — 아이템명 표시 */
export function ExpiryBanner({ items, className }: ExpiryBannerProps) {
  const expiredEntries: ExpiryEntry[] = [];
  const soonEntries: ExpiryEntry[] = [];

  for (const item of items) {
    for (const batch of item.fridge_item_batches) {
      if (batch.expiry_date === null || batch.quantity <= 0) continue;
      const days = getDaysUntilExpiry(batch.expiry_date);
      if (days <= 0) expiredEntries.push({ itemName: item.name, daysLeft: days });
      else if (days <= 3) soonEntries.push({ itemName: item.name, daysLeft: days });
    }
  }

  if (expiredEntries.length === 0 && soonEntries.length === 0) return null;

  const hasExpired = expiredEntries.length > 0;
  const uniqueExpiredNames = [...new Set(expiredEntries.map((e) => e.itemName))];
  const uniqueSoonNames = [...new Set(soonEntries.map((e) => e.itemName))];

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-lg px-3 py-2.5',
        hasExpired ? 'bg-red-50' : 'bg-amber-50',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle
          className={cn('size-4 shrink-0', hasExpired ? 'text-red-600' : 'text-amber-600')}
        />
        <span
          className={cn('text-sm font-semibold', hasExpired ? 'text-red-700' : 'text-amber-700')}
        >
          {hasExpired && <>만료 {expiredEntries.length}건</>}
          {hasExpired && soonEntries.length > 0 && ' · '}
          {soonEntries.length > 0 && <>임박 {soonEntries.length}건</>}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {uniqueExpiredNames.map((name) => (
          <span
            key={`expired-${name}`}
            className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700"
          >
            {name}
          </span>
        ))}
        {uniqueSoonNames.map((name) => (
          <span
            key={`soon-${name}`}
            className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
