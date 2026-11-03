export { mealKeys } from '@/entities/meal';
export {
  useDeleteMealMutation,
  useReorderDishesMutation,
  useUpsertMealMutation,
} from './api/mutations';
export {
  useFridgeItemsForMealQuery,
  useMealsByDateQuery,
  useMealSummaryByRangeQuery,
} from './api/queries';

export { MealCardList } from './ui/MealCardList';
export { MealDateStrip } from './ui/MealDateStrip';
export { MealEditorScreen } from './ui/MealEditorScreen';
export { MealDishesEditor } from './ui/MealDishesEditor';
export { MealDraftCard } from './ui/MealDraftCard';
export { MealDraftEditorScreen } from './ui/MealDraftEditorScreen';
export { FridgeItemSearchScreen } from './ui/FridgeItemSearchScreen';
export { FridgeBatchSelectScreen } from './ui/FridgeBatchSelectScreen';

export type {
  EditorDish as MealDraftDish,
  FridgeBatchSelectOption,
  FridgeItemSearchOption,
} from './lib';
export {
  setPendingFridgeItemCallback,
  resolvePendingFridgeItemCallback,
  clearPendingFridgeItemCallback,
} from './model/fridgeItemSearchStore';
export {
  setPendingFridgeBatchCallback,
  resolvePendingFridgeBatchCallback,
  clearPendingFridgeBatchCallback,
} from './model/fridgeBatchSelectStore';
