'use client';

import { useState } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { overlay } from 'overlay-kit';

import { Button, DeleteConfirmBottomSheet, Toast } from '@/commons/ui';

import { type FridgeItemWithBatches } from '@/entities/fridge-item';

import { useDiscardBatchMutation } from '../api/mutations';
import { getDaysUntilExpiry } from '../lib/expiry';

import { ExpiryBadge } from './ExpiryBadge';

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/

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

/* -------------------------------------------------------------------------------------------------
 * ExpiryItem
 * -----------------------------------------------------------------------------------------------*/

interface ExpiryItemProps {
  entry: ExpiryItemEntry;
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}

function ExpiryItem({ entry, isActive, onActivate, onDeactivate }: ExpiryItemProps) {
  const discardMutation = useDiscardBatchMutation();

  function openDiscardConfirm() {
    overlay.open(({ isOpen, close, unmount }) => {
      function closeSheet() {
        close();
        window.setTimeout(unmount, 200);
      }

      function confirmDiscard() {
        closeSheet();
        discardMutation.mutate(entry.batchId, {
          onSuccess: () => {
            Toast.success('재고를 전부 버렸습니다');
            onDeactivate();
          },
          onError: (error) => {
            Toast.error(
              error instanceof Error ? error.message : '재고 소진 중 오류가 발생했습니다',
            );
          },
        });
      }

      return (
        <DeleteConfirmBottomSheet
          open={isOpen}
          onClose={closeSheet}
          onConfirm={confirmDiscard}
          title="재고를 전부 버리시겠습니까?"
          description="버린 재고는 복구할 수 없습니다."
          confirmLabel="전부 버리기"
          isPending={discardMutation.isPending}
        />
      );
    });
  }

  return (
    <li className="relative flex items-center gap-3 overflow-hidden py-3">
      <button
        type="button"
        className="absolute inset-0 z-10"
        onClick={isActive ? onDeactivate : onActivate}
        aria-label={isActive ? '닫기' : '재고 버리기 열기'}
      />
      <span className="flex-1 text-sm font-medium text-gray-900">{entry.itemName}</span>
      <ExpiryBadge daysLeft={entry.daysLeft} />

      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute inset-y-0 right-0 z-20 flex items-center"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 160, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
          >
            <div className="absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-transparent to-white" />
            <div className="absolute inset-y-0 right-0 left-14 bg-white" />
            <Button
              type="button"
              variant="destructive"
              size="xs"
              className="relative z-10 mr-3 ml-auto shrink-0 whitespace-nowrap"
              onClick={openDiscardConfirm}
              disabled={discardMutation.isPending}
            >
              재고 버리기
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
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
  const expiryEntries = buildExpiryEntries(items);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  function activate(key: string) {
    setActiveKey(key);
  }

  function deactivate() {
    setActiveKey(null);
  }

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
          <ul className="divide-y divide-gray-100">
            {expiryEntries.map((entry) => {
              const key = `${entry.itemId}-${entry.batchId}`;
              return (
                <ExpiryItem
                  key={key}
                  entry={entry}
                  isActive={activeKey === key}
                  onActivate={() => activate(key)}
                  onDeactivate={deactivate}
                />
              );
            })}
          </ul>
        )}
      </div>
    </AppScreen>
  );
}
