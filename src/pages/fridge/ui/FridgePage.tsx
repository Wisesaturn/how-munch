'use client';

import { useMemo, useState } from 'react';

import { Plus } from 'lucide-react';
import { overlay } from 'overlay-kit';

import { stackFlowActions } from '@/apps/stackflow/StackFlow';

import { Button } from '@/commons/ui';

import { type FridgeItemBatch, type FridgeItemWithBatches } from '@/entities/fridge-item';

import {
  ExpiryBanner,
  FridgeBatchAddBottomSheet,
  FridgeBatchEditBottomSheet,
  FridgeItemEditBottomSheet,
  FridgeItemList,
  FridgeSearch,
  useDeleteBatchMutation,
  useDeleteFridgeItemMutation,
  useFridgeItemsQuery,
} from '@/features/fridge-manager';

interface FridgePageProps {
  householdId: string;
}

export function FridgePage({ householdId }: FridgePageProps) {
  const [search, setSearch] = useState('');

  const { data: items = [], isLoading } = useFridgeItemsQuery(householdId);
  const deleteItemMutation = useDeleteFridgeItemMutation();
  const deleteBatchMutation = useDeleteBatchMutation();

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, search]);

  const handleDeleteItem = (id: string) => {
    deleteItemMutation.mutate(id);
  };

  const handleDeleteBatch = (id: string) => {
    deleteBatchMutation.mutate(id);
  };

  const createOverlayCloseHandler = (close: () => void, unmount: () => void) => {
    close();
    window.setTimeout(unmount, 200);
  };

  const openFridgeItemAddSheet = () => {
    stackFlowActions.push('FridgeItemAddActivity', { householdId });
  };

  const openFridgeItemEditSheet = (item: FridgeItemWithBatches) => {
    overlay.open(({ isOpen, close, unmount }) => (
      <FridgeItemEditBottomSheet
        open={isOpen}
        onClose={() => createOverlayCloseHandler(close, unmount)}
        item={item}
      />
    ));
  };

  const openFridgeBatchAddSheet = (item: FridgeItemWithBatches) => {
    overlay.open(({ isOpen, close, unmount }) => (
      <FridgeBatchAddBottomSheet
        open={isOpen}
        onClose={() => createOverlayCloseHandler(close, unmount)}
        fridgeItemId={item.id}
        itemName={item.name}
      />
    ));
  };

  const openFridgeBatchEditSheet = (batch: FridgeItemBatch, itemName: string) => {
    overlay.open(({ isOpen, close, unmount }) => (
      <FridgeBatchEditBottomSheet
        open={isOpen}
        onClose={() => createOverlayCloseHandler(close, unmount)}
        batch={batch}
        itemName={itemName}
      />
    ));
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      {/* 헤더 */}
      <header>
        <h1 className="text-lg font-bold">냉장고</h1>
        <p className="text-xs text-gray-400">
          총 {items.length}종 · {items.reduce((sum, i) => sum + i.total_count, 0)}개
        </p>
      </header>

      {/* 만료 임박 배너 */}
      {!search.trim() && <ExpiryBanner items={items} />}

      {/* 검색 */}
      <FridgeSearch value={search} onChange={setSearch} />

      {/* 리스트 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="text-sm text-gray-400">불러오는 중...</span>
        </div>
      ) : (
        <FridgeItemList
          items={filtered}
          onEditItem={openFridgeItemEditSheet}
          onDeleteItem={handleDeleteItem}
          onAddBatch={openFridgeBatchAddSheet}
          onEditBatch={openFridgeBatchEditSheet}
          onDeleteBatch={handleDeleteBatch}
        />
      )}

      {/* FAB 추가 버튼 */}
      <Button
        onClick={openFridgeItemAddSheet}
        className="fixed right-4 [bottom:calc(constant(safe-area-inset-bottom)+84px)] [bottom:calc(env(safe-area-inset-bottom)+84px)] z-40 size-12 rounded-full shadow-lg sm:right-[calc(50%-215px+16px)]"
        size="icon-lg"
      >
        <Plus className="size-5" />
      </Button>
    </div>
  );
}
