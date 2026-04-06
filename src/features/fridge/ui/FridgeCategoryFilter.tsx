'use client';

import { Chip, ChipRow } from '@/commons/ui';

import { type IngredientCategoryOption } from '@/entities/ingredient-category';

const ALL_CATEGORY_ID = 'all';

interface FridgeCategoryFilterProps {
  categories: IngredientCategoryOption[];
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
}

export function FridgeCategoryFilter({
  categories,
  selectedCategoryId,
  onCategoryChange,
}: FridgeCategoryFilterProps) {
  return (
    <ChipRow role="radiogroup" aria-label="카테고리 필터">
      <Chip
        selected={selectedCategoryId === ALL_CATEGORY_ID}
        onSelectedChange={() => onCategoryChange(ALL_CATEGORY_ID)}
      >
        전체
      </Chip>
      {categories.map((category) => (
        <Chip
          key={category.id}
          selected={selectedCategoryId === category.id}
          onSelectedChange={() => onCategoryChange(category.id)}
        >
          <span className="font-tossface" aria-hidden>
            {category.emoji}
          </span>
          {category.label}
        </Chip>
      ))}
    </ChipRow>
  );
}

export { ALL_CATEGORY_ID };
