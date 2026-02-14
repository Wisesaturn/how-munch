import { AlertTriangle } from 'lucide-react';

import { cn } from '@/commons/lib';

import { type FridgeItemWithBatches } from '@/entities/fridge-item';

import { getDaysUntilExpiry } from '../lib/expiry';

interface ExpiryBannerProps {
  items: FridgeItemWithBatches[];
  className?: string;
}

/** 만료 임박/만료됨 요약 배너 */
export function ExpiryBanner({ items, className }: ExpiryBannerProps) {
  let expiredCount = 0;
  let soonCount = 0;

  for (const item of items) {
    for (const batch of item.fridge_item_batches) {
      if (batch.expiry_date === null || batch.quantity <= 0) continue;
      const days = getDaysUntilExpiry(batch.expiry_date);
      if (days <= 0) expiredCount++;
      else if (days <= 3) soonCount++;
    }
  }

  if (expiredCount === 0 && soonCount === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
        expiredCount > 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700',
        className,
      )}
    >
      <AlertTriangle className="size-4 shrink-0" />
      <span>
        {expiredCount > 0 && <strong>만료 {expiredCount}건</strong>}
        {expiredCount > 0 && soonCount > 0 && ' · '}
        {soonCount > 0 && <strong>만료 임박 {soonCount}건</strong>}
      </span>
    </div>
  );
}
