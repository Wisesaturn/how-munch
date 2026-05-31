'use client';

import { format } from 'date-fns';
import { ChevronRight, Pencil, Plus } from 'lucide-react';

import { Activity, BottomSheet, Button } from '@/commons/ui';

import { type FridgeItemBatch, type FridgeItemWithBatches } from '@/entities/fridge-item';
import { formatIngredientAmount } from '@/entities/ingredient';

import { getDaysUntilExpiry } from '../lib/expiry';

import { ExpiryBadge } from './ExpiryBadge';

interface FridgeBatchListBottomSheetProps {
  open: boolean;
  onClose: () => void;
  item: FridgeItemWithBatches;
  onAddBatch: () => void;
  onEditItem: () => void;
  onEditBatch: (batch: FridgeItemBatch) => void;
}

/** 아이템 배치 목록 바텀시트 — 재고 단위별 조회·편집 진입점 */
export function FridgeBatchListBottomSheet({
  open,
  onClose,
  item,
  onAddBatch,
  onEditItem,
  onEditBatch,
}: FridgeBatchListBottomSheetProps) {
  const usedAmountByBatchId = new Map<string, number>();
  for (const usage of item.meal_batch_usages ?? []) {
    const prev = usedAmountByBatchId.get(usage.batch_id) ?? 0;
    usedAmountByBatchId.set(usage.batch_id, prev + Number(usage.amount));
  }

  const sortedBatches = [...item.fridge_item_batches]
    .filter((b) => !b.deleted_at)
    .sort(
      (a, b) =>
        new Date(a.purchased_date).getTime() - new Date(b.purchased_date).getTime() ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheet.Header>
        <div className="flex w-full items-center justify-between px-1">
          <span className="text-base font-semibold">{item.name} 재고</span>
          <button
            type="button"
            onClick={onEditItem}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-500 transition-colors active:bg-gray-100"
          >
            <Pencil className="size-3.5" />
            재료 수정
          </button>
        </div>
      </BottomSheet.Header>
      <BottomSheet.Content>
        <Activity visible={sortedBatches.length === 0}>
          <p className="py-6 text-center text-sm text-gray-400">등록된 재고가 없습니다</p>
        </Activity>

        <Activity visible={sortedBatches.length > 0}>
          <ul className="divide-y divide-gray-50">
            {sortedBatches.map((batch) => {
              const batchUsed = usedAmountByBatchId.get(batch.id) ?? 0;
              const daysLeft = batch.expiry_date ? getDaysUntilExpiry(batch.expiry_date) : null;

              return (
                <li key={batch.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-1 py-3 text-left transition-colors active:bg-gray-50"
                    onClick={() => onEditBatch(batch)}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {formatIngredientAmount(Number(batch.quantity), item.unit, true)}
                        </span>
                        <Activity visible={batchUsed > 0}>
                          <span className="text-[11px] text-gray-400">
                            -{formatIngredientAmount(Number(batchUsed), item.unit, true)} 사용
                          </span>
                        </Activity>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>구매 {format(new Date(batch.purchased_date), 'MM.dd')}</span>
                        <Activity visible={!!batch.memo}>
                          <span className="truncate">{batch.memo ?? ''}</span>
                        </Activity>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <ExpiryBadge daysLeft={daysLeft} />
                      <ChevronRight className="size-4 text-gray-300" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Activity>

        <div className="mt-3 pb-2">
          <Button variant="outline" size="sm" onClick={onAddBatch} className="w-full">
            <Plus className="mr-1.5 size-4" />
            재고 추가
          </Button>
        </div>
      </BottomSheet.Content>
    </BottomSheet>
  );
}
