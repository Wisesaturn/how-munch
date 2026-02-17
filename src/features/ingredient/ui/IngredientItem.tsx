'use client';

import { CATEGORIES } from '@/commons/config';

import { formatIngredientAmount, type Ingredient } from '@/entities/ingredient';

interface IngredientItemProps {
  ingredient: Ingredient;
  onEdit: (ingredient: Ingredient) => void;
}

function getCategoryLabel(categoryId: string) {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  return cat ? `${cat.emoji} ${cat.label}` : categoryId;
}

function formatUnit(count: number, unit: Ingredient['unit']) {
  return formatIngredientAmount(count, unit, true);
}

export function IngredientItem({ ingredient, onEdit }: IngredientItemProps) {
  const metaItems = [
    getCategoryLabel(ingredient.category),
    formatUnit(ingredient.count, ingredient.unit),
    ingredient.store,
  ].filter(Boolean) as string[];

  return (
    <button
      type="button"
      className="text-foreground flex w-full appearance-none flex-col gap-1 rounded-lg border bg-white px-3 py-2.5 text-left"
      onClick={() => onEdit(ingredient)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-base font-normal text-gray-900">{ingredient.name}</span>
        <span className="ml-auto shrink-0 text-base font-semibold text-gray-900">
          {ingredient.price.toLocaleString()}원
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        {metaItems.map((meta, index) => (
          <span key={`${ingredient.id}-meta-${index}`} className="truncate">
            {meta}
            {index < metaItems.length - 1 ? <span className="ml-2 text-gray-300">|</span> : null}
          </span>
        ))}
      </div>
    </button>
  );
}
