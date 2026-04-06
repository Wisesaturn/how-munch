'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { ChevronLeft } from 'lucide-react';

import { Button } from '@/commons/ui';

import { type FridgeItemWithBatches } from '@/entities/fridge-item';

import { getDaysUntilExpiry } from '../lib/expiry';

import { ExpiryBadge } from './ExpiryBadge';

/* ------------------------------------------------------------------------------------------------- */
/* Root                                                                                              */
/* ------------------------------------------------------------------------------------------------- */

interface FridgeExpiryListScreenProps {
  onClose: () => void;
  items: FridgeItemWithBatches[];
}

/* ------------------------------------------------------------------------------------------------- */
/* Helpers                                                                                           */
/* ------------------------------------------------------------------------------------------------- */

interface ExpiryItemEntry {
  itemId: string;
  itemName: string;
  batchId: string;
  daysLeft: number;
}

function buildExpiryEntries(items: FridgeItemWithBatches[]): ExpiryItemEntry[] {
  const entries: ExpiryItemEntry[] = [];

  for (const item of items) {
    for (const batch of item.fridge_item_batches) {
      if (batch.expiry_date === null || Number(batch.quantity) <= 0) continue;
      const daysLeft = getDaysUntilExpiry(batch.expiry_date);
      if (daysLeft <= 3) {
        entries.push({
          itemId: item.id,
          itemName: item.name,
          batchId: batch.id,
          daysLeft,
        });
      }
    }
  }

  return entries.sort((a, b) => a.daysLeft - b.daysLeft);
}

/* ------------------------------------------------------------------------------------------------- */
/* Screen                                                                                            */
/* ------------------------------------------------------------------------------------------------- */

/** 만료됐거나 만료 임박한 재료 목록을 보여주는 Stackflow Screen */
export function FridgeExpiryListScreen({ onClose, items }: FridgeExpiryListScreenProps) {
  const expiryEntries = buildExpiryEntries(items);

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: '만료 재료',
        backButton: {
          render: () => (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="뒤로가기"
            >
              <ChevronLeft className="size-5" />
            </Button>
          ),
        },
      }}
    >
      <div className="px-4 pb-8 pt-2">
        {expiryEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-gray-500">만료 또는 임박한 재료가 없습니다</p>
            <p className="mt-1 text-xs text-gray-400">모든 재료가 유통기한 내에 있습니다</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {expiryEntries.map((entry) => (
              <li key={`${entry.itemId}-${entry.batchId}`} className="flex items-center gap-3 py-3">
                <span className="flex-1 text-sm font-medium text-gray-900">{entry.itemName}</span>
                <ExpiryBadge daysLeft={entry.daysLeft} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppScreen>
  );
}
