'use client';

import { createSafeContext } from '@/commons/lib/context';

import { type EditorDish, type MealFridgeItem } from '../lib';

interface MealEditorContextValue {
  dishes: EditorDish[];
  fridgeItems: MealFridgeItem[];
  inUseStockAmountByBatchId: Record<string, number>;
  changeDishes: (nextDishes: EditorDish[]) => void;
  openFridgeItemSearch?: (currentItemId: string, onSelectId: (id: string) => void) => void;
  openBatchSelect?: (fridgeItemId: string, onSelectBatchId: (batchId: string) => void) => void;
}

const [MealEditorProvider, useMealEditorContext] =
  createSafeContext<MealEditorContextValue>('MealEditor');

export { MealEditorProvider, useMealEditorContext };
