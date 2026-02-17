import { type IngredientUnit } from '@/entities/ingredient';

interface EditorIngredient {
  fridge_item_id: string;
  amount: number;
}

interface EditorDish {
  name: string;
  ingredients: EditorIngredient[];
}

interface FridgeStockInfo {
  itemName: string;
  availableAmount: number;
  unit: IngredientUnit;
  unitLabel: string;
}

interface MealFridgeItem {
  id: string;
  name: string;
  total_count: number | string;
  unit: IngredientUnit;
}

export type { EditorDish, EditorIngredient, FridgeStockInfo, MealFridgeItem };
