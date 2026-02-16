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
  unitLabel: string;
}

interface MealFridgeItem {
  id: string;
  name: string;
  total_count: number | string;
  unit: 'count' | 'g';
}

export type { EditorDish, EditorIngredient, FridgeStockInfo, MealFridgeItem };
