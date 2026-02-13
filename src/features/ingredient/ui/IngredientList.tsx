'use client';

import { useMemo } from 'react';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { groupBy } from 'es-toolkit';
import { ShoppingCart } from 'lucide-react';

import { EmptyState } from '@/commons/ui';

import { type Ingredient } from '@/entities/ingredient';

import { IngredientItem } from './IngredientItem';

interface IngredientListProps {
  ingredients: Ingredient[];
  onEdit: (ingredient: Ingredient) => void;
  onDelete: (id: string) => void;
}

export function IngredientList({ ingredients, onEdit, onDelete }: IngredientListProps) {
  const grouped = useMemo(() => {
    const groups = groupBy(ingredients, (item) => item.date);
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [ingredients]);

  if (ingredients.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart className="size-10 text-gray-300" />}
        title="장보기 내역이 없습니다"
        description="+ 버튼을 눌러 장보기 내역을 추가해 보세요"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {grouped.map(([date, items]) => (
        <div key={date} className="flex flex-col gap-1.5">
          <h3 className="px-1 text-xs font-semibold text-gray-500">
            {format(new Date(date), 'M월 d일 (EEEE)', { locale: ko })}
          </h3>
          <div className="flex flex-col gap-1.5">
            {items.map((item) => (
              <IngredientItem key={item.id} ingredient={item} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
