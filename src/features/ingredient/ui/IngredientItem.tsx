'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Pencil, Trash2 } from 'lucide-react';

import { CATEGORIES } from '@/commons/config';
import { Badge, Button } from '@/commons/ui';

import { type Ingredient } from '@/entities/ingredient';

interface IngredientItemProps {
  ingredient: Ingredient;
  onEdit: (ingredient: Ingredient) => void;
  onDelete: (id: string) => void;
}

function getCategoryLabel(categoryId: string) {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  return cat ? `${cat.emoji} ${cat.label}` : categoryId;
}

function formatUnit(count: number, unit: string) {
  return unit === 'g' ? `${count}g` : `${count}개`;
}

export function IngredientItem({ ingredient, onEdit, onDelete }: IngredientItemProps) {
  const handleDelete = () => {
    if (window.confirm(`'${ingredient.name}' 항목을 삭제할까요?`)) {
      onDelete(ingredient.id);
    }
  };

  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-white px-3 py-2.5">
      {/* 1행: 날짜 | 카테고리 | 이름 */}
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs text-gray-400">
          {format(new Date(ingredient.date), 'M/d (EEE)', { locale: ko })}
        </span>
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          {getCategoryLabel(ingredient.category)}
        </Badge>
        <span className="truncate text-sm font-medium">{ingredient.name}</span>
      </div>

      {/* 2행: 수량 | 구매처 | 가격 | 액션 */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="shrink-0">{formatUnit(ingredient.count, ingredient.unit)}</span>
        {ingredient.store && (
          <>
            <span className="text-gray-300">|</span>
            <span className="truncate">{ingredient.store}</span>
          </>
        )}
        <span className="ml-auto shrink-0 font-semibold text-gray-700">
          {ingredient.price.toLocaleString()}원
        </span>
        <div className="flex shrink-0 gap-0.5">
          <Button variant="ghost" size="icon-xs" onClick={() => onEdit(ingredient)}>
            <Pencil className="size-3 text-gray-400" />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={handleDelete}>
            <Trash2 className="size-3 text-gray-400" />
          </Button>
        </div>
      </div>
    </div>
  );
}
