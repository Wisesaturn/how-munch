export interface IngredientCategory {
  id: string;
  household_id: string | null;
  code: string;
  name: string;
  emoji_unicode: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface IngredientCategoryOption {
  id: string;
  code: string;
  label: string;
  emoji: string;
  emojiUnicode: string;
  sortOrder: number;
}
