'use client';

import { Plus } from 'lucide-react';

import { Button } from '@/commons/ui';

import { type IngredientUnit } from '@/entities/ingredient';

import { useFridgeItemsForMealQuery } from '../api/queries';
import {
  appendDish,
  type EditorDish,
  type FridgeBatchSelectOption,
  type FridgeItemSearchOption,
} from '../lib';
import { MealEditorProvider, toMealFridgeItems } from '../model';

import { MealDishCard } from './MealDishCard';

interface MealDishesEditorProps {
  householdId: string;
  dishes: EditorDish[];
  onDishesChange: (dishes: EditorDish[]) => void;
  onOpenFridgeItemSearch?: (
    items: FridgeItemSearchOption[],
    onSelectId: (fridgeItemId: string) => void,
  ) => void;
  onOpenFridgeBatchSelect?: (
    batches: FridgeBatchSelectOption[],
    unit: IngredientUnit,
    onSelectBatchId: (batchId: string) => void,
  ) => void;
}

/**
 * 식단 편집 화면의 메뉴 카드 목록(메뉴 이름, 재료 선택, 수량/사용 조절, 메뉴 추가)을 따로 쓸 수 있게 묶었다.
 * 저장과 검사는 쓰는 쪽이 한다. 아직 저장 전인 메뉴라 이미 쓴 재고(inUse)는 없다고 본다.
 */
export function MealDishesEditor({
  householdId,
  dishes,
  onDishesChange,
  onOpenFridgeItemSearch,
  onOpenFridgeBatchSelect,
}: MealDishesEditorProps) {
  const selectedFridgeItemIds = dishes.flatMap((dish) =>
    dish.ingredients.map((ingredient) => ingredient.fridge_item_id),
  );
  const { data: fridgeItemOptions = [] } = useFridgeItemsForMealQuery(
    householdId,
    selectedFridgeItemIds,
  );
  const fridgeItems = toMealFridgeItems(fridgeItemOptions);

  function openFridgeItemSearch(_currentItemId: string, onSelectId: (id: string) => void) {
    if (!onOpenFridgeItemSearch) return;
    onOpenFridgeItemSearch(
      fridgeItems.map((item) => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        depleted: Number(item.total_count) <= 0,
      })),
      onSelectId,
    );
  }

  function openBatchSelect(fridgeItemId: string, onSelectBatchId: (batchId: string) => void) {
    if (!onOpenFridgeBatchSelect) return;
    const item = fridgeItems.find((fridgeItem) => fridgeItem.id === fridgeItemId);
    if (!item) return;
    onOpenFridgeBatchSelect(
      item.fridge_item_batches
        .filter((batch) => Number(batch.quantity) > 0)
        .map((batch) => ({
          id: batch.id,
          purchasedDate: batch.purchased_date,
          quantity: Number(batch.quantity),
          expiryDate: batch.expiry_date,
        })),
      item.unit,
      onSelectBatchId,
    );
  }

  return (
    <MealEditorProvider
      dishes={dishes}
      fridgeItems={fridgeItems}
      inUseStockAmountByBatchId={{}}
      changeDishes={onDishesChange}
      openFridgeItemSearch={onOpenFridgeItemSearch ? openFridgeItemSearch : undefined}
      openBatchSelect={onOpenFridgeBatchSelect ? openBatchSelect : undefined}
    >
      <div className="space-y-3">
        {dishes.map((_, dishIndex) => (
          <MealDishCard key={`dish-${dishIndex}`} dishIndex={dishIndex} />
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        className="mt-3 w-full"
        onClick={() => onDishesChange(appendDish(dishes))}
      >
        <Plus className="size-4" /> 메뉴 추가
      </Button>
    </MealEditorProvider>
  );
}
