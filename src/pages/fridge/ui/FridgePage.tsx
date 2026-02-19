'use client';

import { Plus } from 'lucide-react';
import { parseAsString, useQueryState } from 'nuqs';
import { overlay } from 'overlay-kit';

import { stackFlowActions } from '@/apps/stackflow/StackFlow';

import { Button } from '@/commons/ui';

import { type FridgeItemBatch, type FridgeItemWithBatches } from '@/entities/fridge-item';
import { type IngredientUnit } from '@/entities/ingredient';

import {
  ExpiryBanner,
  FridgeBatchAddBottomSheet,
  FridgeItemList,
  FridgeSearch,
  useFridgeItemsQuery,
} from '@/features/fridge';

interface FridgePageProps {
  householdId: string;
}

export function FridgePage({ householdId }: FridgePageProps) {
  const [searchValue, setSearchValue] = useQueryState(
    'name',
    parseAsString.withDefault('').withOptions({
      clearOnDefault: true,
      limitUrlUpdates: {
        method: 'debounce',
        timeMs: 300,
      },
    }),
  );
  const { data: items = [], isLoading } = useFridgeItemsQuery(householdId, searchValue);

  const createOverlayCloseHandler = (close: () => void, unmount: () => void) => {
    close();
    window.setTimeout(unmount, 200);
  };

  const openFridgeItemAddSheet = () => {
    stackFlowActions.push('FridgeItemAddActivity', { householdId });
  };

  const openFridgeItemEditSheet = (item: FridgeItemWithBatches) => {
    stackFlowActions.push('FridgeItemEditActivity', { item });
  };

  const openFridgeBatchAddSheet = (item: FridgeItemWithBatches) => {
    overlay.open(({ isOpen, close, unmount }) => (
      <FridgeBatchAddBottomSheet
        open={isOpen}
        onClose={() => createOverlayCloseHandler(close, unmount)}
        fridgeItemId={item.id}
        itemName={item.name}
        unit={item.unit}
      />
    ));
  };

  const openFridgeBatchEditSheet = (
    batch: FridgeItemBatch,
    unit: IngredientUnit,
    fromStore: boolean,
  ) => {
    stackFlowActions.push('FridgeBatchEditActivity', { batch, unit, fromStore });
  };

  async function changeSearchValue(value: string) {
    await setSearchValue(value);
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-5">
      {/* 만료 임박 배너 */}
      {!searchValue.trim() && <ExpiryBanner items={items} />}

      {/* 검색 */}
      <FridgeSearch value={searchValue} onChange={changeSearchValue} />

      {/* 리스트 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="text-sm text-gray-400">불러오는 중...</span>
        </div>
      ) : (
        <FridgeItemList
          householdId={householdId}
          items={items}
          isSearching={Boolean(searchValue.trim())}
          onEditItem={openFridgeItemEditSheet}
          onAddBatch={openFridgeBatchAddSheet}
          onEditBatch={openFridgeBatchEditSheet}
        />
      )}

      {/* FAB 추가 버튼 */}
      <Button
        onClick={openFridgeItemAddSheet}
        color="primary"
        className="fixed right-4 [bottom:calc(constant(safe-area-inset-bottom)+84px)] [bottom:calc(env(safe-area-inset-bottom)+84px)] z-40 size-12 rounded-full shadow-lg sm:right-[calc(50%-215px+16px)]"
        size="icon-lg"
      >
        <Plus className="size-5" />
      </Button>
    </div>
  );
}
