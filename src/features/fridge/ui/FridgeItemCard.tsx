'use client';

import { format } from 'date-fns';
import { AlertTriangle, Plus } from 'lucide-react';

import { cn } from '@/commons/lib';
import { Accordion, Button, ProgressBar } from '@/commons/ui';

import { type FridgeItemBatch, type FridgeItemWithBatches } from '@/entities/fridge-item';
import { formatIngredientAmount, type IngredientUnit } from '@/entities/ingredient';

import { getDaysUntilExpiry } from '../lib/expiry';

import { ExpiryBadge } from './ExpiryBadge';

interface FridgeItemCardProps {
  item: FridgeItemWithBatches;
  categoryEmoji?: string;
  onEditItem: (item: FridgeItemWithBatches) => void;
  onAddBatch: (item: FridgeItemWithBatches) => void;
  onEditBatch: (batch: FridgeItemBatch, unit: IngredientUnit, fromStore: boolean) => void;
}

function getRemainingRate(availableCount: number, usedCount: number) {
  const safeAvailableCount = Number(availableCount);
  const safeUsedCount = Number(usedCount);
  if (!Number.isFinite(safeAvailableCount) || !Number.isFinite(safeUsedCount)) return 0;

  const totalStock = safeAvailableCount + safeUsedCount;
  if (totalStock <= 0) return 0;

  const remainingRatio = (safeAvailableCount / totalStock) * 100;
  return Math.max(0, Math.min(100, Math.round(remainingRatio)));
}

/** 냉장고 아이템 카드 — Accordion 기반 접기/펼치기 */
export function FridgeItemCard({
  item,
  categoryEmoji,
  onEditItem,
  onAddBatch,
  onEditBatch,
}: FridgeItemCardProps) {
  const usedAmountByBatchId = new Map<string, number>();
  for (const usage of item.meal_batch_usages ?? []) {
    const prev = usedAmountByBatchId.get(usage.batch_id) ?? 0;
    usedAmountByBatchId.set(usage.batch_id, prev + Number(usage.amount));
  }

  const totalUsedCount = Array.from(usedAmountByBatchId.values()).reduce((sum, amount) => {
    const safeAmount = Number(amount);
    return Number.isFinite(safeAmount) ? sum + safeAmount : sum;
  }, 0);

  const isOutOfStock = Number(item.total_count) <= 0;
  const remainingRate = isOutOfStock ? null : getRemainingRate(item.total_count, totalUsedCount);
  const sortedBatches = [...item.fridge_item_batches].sort(
    (a, b) => new Date(a.purchased_date).getTime() - new Date(b.purchased_date).getTime(),
  );
  const hasExpiredBatch = item.fridge_item_batches.some((batch) => {
    if (Number(batch.quantity) <= 0) return false;
    if (!batch.expiry_date) return false;
    return getDaysUntilExpiry(batch.expiry_date) < 0;
  });

  return (
    <Accordion
      type="single"
      collapsible
      variant="outlined"
      invalid={hasExpiredBatch}
      disabled={isOutOfStock}
      className="rounded-lg transition-colors"
    >
      <Accordion.Item value={item.id} className="border-b-0">
        <div className="flex items-start gap-2 px-3 py-3">
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={() => onEditItem(item)}
            className={cn('min-w-0 flex-1 text-left', isOutOfStock && 'cursor-not-allowed')}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                {categoryEmoji ? (
                  <span className="font-tossface shrink-0 text-base" aria-hidden>
                    {categoryEmoji}
                  </span>
                ) : null}
                <span
                  className={cn(
                    'truncate text-base font-normal',
                    isOutOfStock ? 'text-gray-400' : 'text-gray-900',
                  )}
                >
                  {item.name}
                </span>
                {hasExpiredBatch ? (
                  <AlertTriangle
                    className="size-4 shrink-0 text-red-500"
                    aria-label="만료된 재고 있음"
                  />
                ) : null}
                {item.is_subdivided ? (
                  <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                    소분
                  </span>
                ) : null}
              </div>
              <span
                className={cn(
                  'shrink-0 text-sm font-semibold',
                  isOutOfStock ? 'text-gray-400' : 'text-gray-900',
                )}
              >
                {formatIngredientAmount(Number(item.total_count), item.unit, true)}
              </span>
            </div>
            {remainingRate === null ? null : (
              <div className="mt-2 flex items-center gap-2">
                <ProgressBar value={remainingRate} className="h-1.5 flex-1" />
                <span className="shrink-0 text-[11px] text-emerald-600">
                  잔여율 {remainingRate}%
                </span>
              </div>
            )}
          </button>
          <Accordion.Trigger className="mt-0.5 shrink-0 py-0" aria-label="재고 상세 펼치기" />
        </div>

        {/* 배치 목록 */}
        <Accordion.Content className="border-t border-gray-50">
          <div className="px-3">
            {sortedBatches.length === 0 ? (
              <p className="py-3 text-center text-xs text-gray-400">등록된 재고가 없습니다</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {sortedBatches.map((batch) => {
                  const batchUsed = usedAmountByBatchId.get(batch.id) ?? 0;
                  return (
                    <li key={batch.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 py-2.5 text-left text-xs transition-colors active:bg-gray-50"
                        onClick={() => onEditBatch(batch, item.unit, item.from_grocery)}
                      >
                        <span className="text-gray-500">
                          {format(new Date(batch.purchased_date), 'MM.dd')}
                        </span>
                        <span className="font-medium">
                          {formatIngredientAmount(Number(batch.quantity), item.unit, true)}
                        </span>
                        {batchUsed > 0 ? (
                          <span className="text-[10px] text-gray-400">
                            (-{formatIngredientAmount(Number(batchUsed), item.unit, true)} 사용)
                          </span>
                        ) : null}
                        <ExpiryBadge
                          daysLeft={
                            batch.expiry_date ? getDaysUntilExpiry(batch.expiry_date) : null
                          }
                        />
                        {batch.memo ? (
                          <span className="min-w-0 flex-1 break-words whitespace-pre-wrap text-gray-400">
                            {batch.memo}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-2">
              <Button
                variant="outline"
                size="xs"
                onClick={() => onAddBatch(item)}
                className="flex-1"
              >
                <Plus className="mr-1 size-3" />
                재고 추가
              </Button>
            </div>
          </div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}
