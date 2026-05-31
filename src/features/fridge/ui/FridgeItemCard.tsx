'use client';

import { AlertTriangle } from 'lucide-react';

import { stackFlowActions } from '@/apps/stackflow/StackFlow';

import { cn } from '@/commons/lib';
import { Activity, ProgressBar, SwipeAction } from '@/commons/ui';

import { type FridgeItemWithBatches } from '@/entities/fridge-item';
import { formatIngredientAmount } from '@/entities/ingredient';

import { getDaysUntilExpiry } from '../lib/expiry';

import { ExpiryBadge } from './ExpiryBadge';

interface FridgeItemCardProps {
  item: FridgeItemWithBatches;
  categoryEmoji?: string;
  onOpenSheet: (item: FridgeItemWithBatches) => void;
  onAddBatch: (item: FridgeItemWithBatches) => void;
}

function getRemainingRate(availableCount: number, usedCount: number) {
  const safeAvailable = Number(availableCount);
  const safeUsed = Number(usedCount);
  if (!Number.isFinite(safeAvailable) || !Number.isFinite(safeUsed)) return 0;
  const total = safeAvailable + safeUsed;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((safeAvailable / total) * 100)));
}

/** 냉장고 아이템 카드 — SwipeAction으로 퀵 액션 노출, 탭으로 배치 목록 시트 진입 */
export function FridgeItemCard({
  item,
  categoryEmoji,
  onOpenSheet,
  onAddBatch,
}: FridgeItemCardProps) {
  const usedAmountByBatchId = new Map<string, number>();
  for (const usage of item.meal_batch_usages ?? []) {
    const prev = usedAmountByBatchId.get(usage.batch_id) ?? 0;
    usedAmountByBatchId.set(usage.batch_id, prev + Number(usage.amount));
  }

  const totalUsedCount = Array.from(usedAmountByBatchId.values()).reduce((sum, amount) => {
    const safe = Number(amount);
    return Number.isFinite(safe) ? sum + safe : sum;
  }, 0);

  const isOutOfStock = Number(item.total_count) <= 0;
  const remainingRate =
    item.unit === 'count' && !isOutOfStock
      ? getRemainingRate(item.total_count, totalUsedCount)
      : null;

  const activeBatches = item.fridge_item_batches.filter(
    (b) => !b.deleted_at && Number(b.quantity) > 0,
  );
  const hasExpiredBatch = activeBatches.some(
    (b) => b.expiry_date && getDaysUntilExpiry(b.expiry_date) < 0,
  );
  const soonestExpiry = activeBatches
    .filter((b) => b.expiry_date)
    .map((b) => ({ batch: b, days: getDaysUntilExpiry(b.expiry_date!) }))
    .sort((a, b) => a.days - b.days)[0];

  const swipeActions = [
    {
      id: 'subdivide',
      label: '소분',
      className: 'bg-indigo-500',
      onPress: () =>
        stackFlowActions.push('FridgeItemSubdivideActivity', {
          fridgeItemId: item.id,
          itemName: item.name,
          totalCount: item.total_count,
          unit: item.unit,
          batches: item.fridge_item_batches.filter((b) => !b.deleted_at),
        }),
    },
    {
      id: 'add-batch',
      label: '재고추가',
      className: 'bg-emerald-500',
      onPress: () => onAddBatch(item),
    },
  ];

  return (
    <SwipeAction
      rightActions={swipeActions}
      actionsWidth={124}
      groupId="fridge-card"
      className="rounded-xl"
    >
      <button
        type="button"
        disabled={isOutOfStock}
        onClick={() => onOpenSheet(item)}
        className={cn(
          'w-full rounded-xl border bg-white text-left',
          hasExpiredBatch ? 'border-red-300' : 'border-gray-200',
          isOutOfStock ? 'cursor-default' : 'cursor-pointer',
        )}
      >
        <div className={cn('flex flex-col gap-2 p-3', isOutOfStock && 'opacity-50')}>
          {/* 1행: 이름·브랜드 + 총량·만료일 */}
          <div className="flex items-center gap-2">
            <Activity visible={!!categoryEmoji}>
              <span className="font-tossface shrink-0 text-base" aria-hidden>
                {categoryEmoji}
              </span>
            </Activity>

            <div className="flex min-w-0 flex-1 flex-col">
              <Activity visible={!!item.brand}>
                <span className="truncate text-[11px] text-gray-400">{item.brand}</span>
              </Activity>
              <span
                className={cn(
                  'truncate text-sm font-medium',
                  isOutOfStock ? 'text-gray-400' : 'text-gray-900',
                )}
              >
                {item.name}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className={cn(
                  'text-sm font-semibold tabular-nums',
                  isOutOfStock ? 'text-gray-400' : 'text-gray-900',
                )}
              >
                {formatIngredientAmount(Number(item.total_count), item.unit, true)}
              </span>
              <Activity visible={!!soonestExpiry}>
                <ExpiryBadge daysLeft={soonestExpiry?.days ?? 0} />
              </Activity>
            </div>
          </div>

          {/* 2행: 뱃지 */}
          <Activity visible={item.is_subdivided || hasExpiredBatch}>
            <div className="flex items-center gap-1.5">
              <Activity visible={item.is_subdivided}>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                  소분
                </span>
              </Activity>
              <Activity visible={hasExpiredBatch}>
                <span className="flex items-center gap-0.5 text-[11px] font-medium text-red-500">
                  <AlertTriangle className="size-3" aria-hidden />
                  만료 재고 있음
                </span>
              </Activity>
            </div>
          </Activity>

          {/* 3행: 소진율 — 개(count) 단위만 표시 */}
          <Activity visible={remainingRate !== null}>
            <div className="flex items-center gap-2">
              <ProgressBar value={remainingRate ?? 0} className="h-1.5 flex-1" />
              <span className="shrink-0 text-[11px] text-emerald-600">
                잔여율 {remainingRate ?? 0}%
              </span>
            </div>
          </Activity>
        </div>
      </button>
    </SwipeAction>
  );
}
