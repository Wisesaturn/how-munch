'use client';

import {
  formatIngredientAmount,
  type IngredientUnit,
  type Ingredient,
} from '@/entities/ingredient';

interface IngredientItemProps {
  ingredient: Ingredient;
  onEdit: (ingredient: Ingredient) => void;
  categoryLabel: string;
  categoryEmoji?: string;
}

function formatUnit(count: number, unit: IngredientUnit) {
  return formatIngredientAmount(count, unit, true);
}

export function IngredientItem({
  ingredient,
  onEdit,
  categoryLabel,
  categoryEmoji,
}: IngredientItemProps) {
  const metaItems = [formatUnit(ingredient.count, ingredient.unit), ingredient.store].filter(
    Boolean,
  ) as string[];

  return (
    <button
      type="button"
      className="text-foreground flex w-full appearance-none flex-col gap-1 rounded-lg border bg-white px-3 py-2.5 text-left"
      onClick={() => onEdit(ingredient)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          {ingredient.brand ? (
            <span className="truncate text-xs text-gray-400">{ingredient.brand}</span>
          ) : null}
          <span className="truncate text-base font-normal text-gray-900">{ingredient.name}</span>
        </div>
        <span className="ml-auto shrink-0 text-base font-semibold text-gray-900">
          {ingredient.price.toLocaleString()}원
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="truncate">
          {categoryEmoji ? (
            <span className="font-tossface mr-1" aria-hidden>
              {categoryEmoji}
            </span>
          ) : null}
          <span>{categoryLabel}</span>
          {metaItems.length > 0 ? <span className="ml-2 text-gray-300">|</span> : null}
        </span>
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
