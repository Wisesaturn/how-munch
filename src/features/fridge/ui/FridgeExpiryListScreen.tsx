'use client';

import { format } from 'date-fns';
import { AppScreen } from '@stackflow/plugin-basic-ui';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { overlay } from 'overlay-kit';

import { Activity, Button, DeleteConfirmBottomSheet, SwipeAction, Toast } from '@/commons/ui';

import { type FridgeItemWithBatches } from '@/entities/fridge-item';
import { useIngredientCategory } from '@/entities/ingredient-category';

import { useDeleteBatchMutation, useDiscardBatchMutation } from '../api/mutations';
import { getDaysUntilExpiry } from '../lib/expiry';

import { ExpiryBadge } from './ExpiryBadge';

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/

interface ExpiryItemEntry {
  itemId: string;
  itemName: string;
  categoryEmoji?: string;
  batchId: string;
  purchasedDate: string;
  daysLeft: number;
  isInMeal: boolean;
}

function buildExpiryEntries(
  items: FridgeItemWithBatches[],
  getCategoryById: (id: string) => { emoji: string } | null,
): ExpiryItemEntry[] {
  const entries: ExpiryItemEntry[] = [];

  for (const item of items) {
    const category = getCategoryById(item.category_id);
    for (const batch of item.fridge_item_batches) {
      if (batch.expiry_date === null || Number(batch.quantity) <= 0) continue;
      const daysLeft = getDaysUntilExpiry(batch.expiry_date);
      if (daysLeft <= 3) {
        const isInMeal = (item.meal_batch_usages ?? []).some((u) => u.batch_id === batch.id);
        entries.push({
          itemId: item.id,
          itemName: item.name,
          categoryEmoji: category?.emoji,
          batchId: batch.id,
          purchasedDate: batch.purchased_date,
          daysLeft,
          isInMeal,
        });
      }
    }
  }

  return entries.sort((a, b) => a.daysLeft - b.daysLeft);
}

/* -------------------------------------------------------------------------------------------------
 * ExpiryItem
 * -----------------------------------------------------------------------------------------------*/

interface ExpiryItemProps {
  entry: ExpiryItemEntry;
}

function ExpiryItem({ entry }: ExpiryItemProps) {
  const discardMutation = useDiscardBatchMutation();
  const deleteMutation = useDeleteBatchMutation();

  function openConfirm() {
    overlay.open(({ isOpen, close, unmount }) => {
      function closeSheet() {
        close();
        window.setTimeout(unmount, 200);
      }

      function confirmAction() {
        closeSheet();
        if (entry.isInMeal) {
          discardMutation.mutate(entry.batchId, {
            onSuccess: () => Toast.success('재고를 소진 처리했습니다'),
            onError: (error) =>
              Toast.error(
                error instanceof Error ? error.message : '소진 처리 중 오류가 발생했습니다',
              ),
          });
        } else {
          deleteMutation.mutate(entry.batchId, {
            onSuccess: () => Toast.success('재고를 삭제했습니다'),
            onError: (error) =>
              Toast.error(
                error instanceof Error ? error.message : '재고 삭제 중 오류가 발생했습니다',
              ),
          });
        }
      }

      return (
        <DeleteConfirmBottomSheet
          open={isOpen}
          onClose={closeSheet}
          onConfirm={confirmAction}
          title={entry.isInMeal ? '재고를 소진 처리할까요?' : '재고를 삭제하시겠습니까?'}
          description={
            entry.isInMeal
              ? '식단에 사용된 기록은 유지됩니다.'
              : '삭제된 재고는 복구할 수 없습니다.'
          }
          confirmLabel={entry.isInMeal ? '소진' : '삭제'}
          isPending={discardMutation.isPending || deleteMutation.isPending}
        />
      );
    });
  }

  return (
    <SwipeAction
      rightActions={[
        {
          id: 'discard',
          icon: <Trash2 className="size-4" />,
          className: 'bg-red-500',
          onPress: openConfirm,
        },
      ]}
      rightActionsWidth={80}
      groupId="fridge-expiry"
      className="border-b border-gray-100 last:border-b-0"
    >
      <li className="flex items-center gap-3 bg-white py-3">
        <Activity visible={!!entry.categoryEmoji}>
          <span className="font-tossface shrink-0 text-base" aria-hidden>
            {entry.categoryEmoji}
          </span>
        </Activity>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-gray-900">{entry.itemName}</span>
          <span className="text-xs text-gray-400">
            구매 {format(new Date(entry.purchasedDate), 'MM.dd')}
          </span>
        </div>
        <ExpiryBadge daysLeft={entry.daysLeft} />
      </li>
    </SwipeAction>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Screen
 * -----------------------------------------------------------------------------------------------*/

interface FridgeExpiryListScreenProps {
  onClose: () => void;
  items: FridgeItemWithBatches[];
}

/** 만료됐거나 만료 임박한 재료 목록을 보여주는 Stackflow Screen */
export function FridgeExpiryListScreen({ onClose, items }: FridgeExpiryListScreenProps) {
  const householdId = items[0]?.household_id ?? null;
  const { getCategoryById } = useIngredientCategory(householdId);
  const expiryEntries = buildExpiryEntries(items, getCategoryById);

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
      <div className="px-4 pt-2 pb-8">
        {expiryEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-gray-500">만료 또는 임박한 재료가 없습니다</p>
            <p className="mt-1 text-xs text-gray-400">모든 재료가 유통기한 내에 있습니다</p>
          </div>
        ) : (
          <ul>
            {expiryEntries.map((entry) => (
              <ExpiryItem key={`${entry.itemId}-${entry.batchId}`} entry={entry} />
            ))}
          </ul>
        )}
      </div>
    </AppScreen>
  );
}
