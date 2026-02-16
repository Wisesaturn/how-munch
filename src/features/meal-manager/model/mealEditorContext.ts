'use client';

import { createSafeContext } from '@/commons/lib/context';

import { type EditorDish, type MealFridgeItem } from '../lib';

interface MealEditorContextValue {
  dishes: EditorDish[];
  fridgeItems: MealFridgeItem[];
  changeDishes: (nextDishes: EditorDish[]) => void;
}

const [MealEditorProvider, useMealEditorContext] =
  createSafeContext<MealEditorContextValue>('MealEditor');

export { MealEditorProvider, useMealEditorContext };
