'use client';

import { useState } from 'react';

import { format } from 'date-fns';
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';

import { cn } from '@/commons/lib';
import { Button } from '@/commons/ui';

import { type FridgeItemBatch, type FridgeItemWithBatches } from '@/entities/fridge-item';

import { getDaysUntilExpiry, getWorstExpiry } from '../lib/expiry';

import { ExpiryBadge } from './ExpiryBadge';

interface FridgeItemCardProps {
  item: FridgeItemWithBatches;
  onEditItem: (item: FridgeItemWithBatches) => void;
  onDeleteItem: (id: string) => void;
  onAddBatch: (item: FridgeItemWithBatches) => void;
  onEditBatch: (batch: FridgeItemBatch, itemName: string, unit: 'count' | 'g') => void;
  onDeleteBatch: (id: string) => void;
}

function getDepletionRate(availableCount: number, usedCount: number) {
  const safeAvailableCount = Number(availableCount);
  const safeUsedCount = Number(usedCount);
  if (!Number.isFinite(safeAvailableCount) || !Number.isFinite(safeUsedCount)) return 0;

  const totalStock = safeAvailableCount + safeUsedCount;
  if (totalStock <= 0) return 0;

  const depletionRatio = (safeUsedCount / totalStock) * 100;
  return Math.max(0, Math.min(100, Math.round(depletionRatio)));
}

/** 냉장고 아이템 카드 — 접기/펼치기 지원 */
export function FridgeItemCard({
  item,
  onEditItem,
  onDeleteItem,
  onAddBatch,
  onEditBatch,
  onDeleteBatch,
}: FridgeItemCardProps) {
  const [expanded, setExpanded] = useState(false);

  const worstExpiry = getWorstExpiry(item.fridge_item_batches);
  const unitLabel = item.unit === 'count' ? '개' : 'g';
  const usedAmountByBatchId = new Map<string, number>();
  for (const usage of item.meal_batch_usages ?? []) {
    const prev = usedAmountByBatchId.get(usage.batch_id) ?? 0;
    usedAmountByBatchId.set(usage.batch_id, prev + Number(usage.amount));
  }

  const totalUsedCount = Array.from(usedAmountByBatchId.values()).reduce((sum, amount) => {
    const safeAmount = Number(amount);
    return Number.isFinite(safeAmount) ? sum + safeAmount : sum;
  }, 0);

  const depletionRate = getDepletionRate(item.total_count, totalUsedCount);
  const sortedBatches = [...item.fridge_item_batches].sort(
    (a, b) => new Date(a.purchased_date).getTime() - new Date(b.purchased_date).getTime(),
  );

  return (
    <div className="rounded-lg border border-gray-100 bg-white">
      {/* 접힌 상태 — 요약 행 */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-3 text-left"
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="truncate text-sm font-medium">{item.name}</span>
          {item.is_subdivided ? (
            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
              소분
            </span>
          ) : null}
        </div>
        <span className="shrink-0 text-sm text-gray-500">
          {item.total_count}
          {unitLabel}
        </span>
        <span className="shrink-0 text-xs text-amber-600">소진율 {depletionRate}%</span>
        <ExpiryBadge daysLeft={worstExpiry} className="shrink-0" />
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-gray-400 transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {/* 펼친 상태 — 배치 목록 */}
      {expanded && (
        <div className="border-t border-gray-50 px-3 pb-3">
          {sortedBatches.length === 0 ? (
            <p className="py-3 text-center text-xs text-gray-400">등록된 재고가 없습니다</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {sortedBatches.map((batch) => (
                <li key={batch.id} className="flex items-center gap-2 py-2 text-xs">
                  <span className="text-gray-500">
                    {format(new Date(batch.purchased_date), 'MM.dd')}
                  </span>
                  <span className="font-medium">
                    {batch.quantity}
                    {unitLabel}
                  </span>
                  <ExpiryBadge
                    daysLeft={batch.expiry_date ? getDaysUntilExpiry(batch.expiry_date) : null}
                  />
                  {batch.memo && (
                    <span className="min-w-0 flex-1 truncate text-gray-400">{batch.memo}</span>
                  )}
                  <div className="ml-auto flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onEditBatch(batch, item.name, item.unit)}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => {
                        if (window.confirm('이 재고를 삭제하시겠습니까?')) {
                          onDeleteBatch(batch.id);
                        }
                      }}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* 액션 버튼 */}
          <div className="mt-2 flex gap-2">
            <Button variant="outline" size="xs" onClick={() => onAddBatch(item)} className="flex-1">
              <Plus className="mr-1 size-3" />
              재고 추가
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={() => onEditItem(item)}>
              <Pencil className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                if (window.confirm(`'${item.name}' 전체를 삭제하시겠습니까?`)) {
                  onDeleteItem(item.id);
                }
              }}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
