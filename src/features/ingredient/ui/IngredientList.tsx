'use client';

import { useMemo } from 'react';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { groupBy } from 'es-toolkit';
import { ShoppingCart } from 'lucide-react';

import { EmptyState } from '@/commons/ui';

import { type Ingredient } from '@/entities/ingredient';
import { useIngredientCategory } from '@/entities/ingredient-category';

import { IngredientItem } from './IngredientItem';

function formatDailyTotal(items: Ingredient[]) {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return total === 0 ? '0원' : `-${total.toLocaleString('ko-KR')}원`;
}

interface IngredientListProps {
  householdId: string;
  ingredients: Ingredient[];
  onEdit: (ingredient: Ingredient) => void;
}

export function IngredientList({ householdId, ingredients, onEdit }: IngredientListProps) {
  const { getCategoryById } = useIngredientCategory(householdId);
  const grouped = useMemo(() => {
    const groups = groupBy(ingredients, (item) => item.date);
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [ingredients]);

  if (ingredients.length === 0) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <ShoppingCart className="size-10 text-gray-300" />
          </EmptyState.Indicator>
          <EmptyState.Title>장보기 내역이 없습니다</EmptyState.Title>
          <EmptyState.Description>+ 버튼을 눌러 장보기 내역을 추가해 보세요</EmptyState.Description>
        </EmptyState.Content>
      </EmptyState.Root>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {grouped.map(([date, items]) => (
        <div key={date} className="flex flex-col gap-1.5">
          <h3 className="flex items-center justify-between px-1 text-xs font-semibold text-gray-500">
            <span>{format(new Date(date), 'M월 d일 (EEEE)', { locale: ko })}</span>
            <span className="text-gray-400">{formatDailyTotal(items)}</span>
          </h3>
          <div className="flex flex-col gap-1.5">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="text-foreground flex w-full appearance-none flex-col gap-1 rounded-lg border bg-white px-3 py-2.5 text-left"
                onClick={() => onEdit(item)}
              >
                <IngredientItem
                  name={item.name}
                  brand={item.brand}
                  price={item.price}
                  count={item.count}
                  unit={item.unit}
                  store={item.store}
                  categoryLabel={getCategoryById(item.category_id)?.label ?? ''}
                  categoryEmoji={getCategoryById(item.category_id)?.emoji ?? ''}
                />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
