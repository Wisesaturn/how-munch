'use client';

import { Plus, Trash2 } from 'lucide-react';

import { Button, Input, Separator } from '@/commons/ui';

import {
  appendIngredient,
  excludeDish,
  excludeIngredient,
  renameDish,
  replaceIngredientAmount,
  replaceIngredientItem,
} from '../lib';
import { useMealEditorContext } from '../model';

import { MealIngredientRow } from './MealIngredientRow';

interface MealDishCardProps {
  dishIndex: number;
}

function MealDishCard({ dishIndex }: MealDishCardProps) {
  const { dishes, changeDishes } = useMealEditorContext('MealDishCard');
  const dish = dishes[dishIndex];
  if (!dish) return null;

  const canRemoveDish = dishes.length > 1;

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex items-center gap-2">
        <Input
          value={dish.name}
          onChange={(event) => changeDishes(renameDish(dishes, dishIndex, event.target.value))}
          placeholder={`메뉴 ${dishIndex + 1}`}
          className="flex-1"
        />
        {canRemoveDish ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 text-gray-500 hover:text-red-500"
            onClick={() => changeDishes(excludeDish(dishes, dishIndex))}
            aria-label="메뉴 삭제"
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>

      {dish.ingredients.length > 0 ? <Separator className="my-3" /> : null}

      <div className="space-y-2">
        {dish.ingredients.map((ingredient, ingredientIndex) => (
          <MealIngredientRow
            key={`${dishIndex}-${ingredientIndex}`}
            ingredient={ingredient}
            onChangeIngredientItem={(value) =>
              changeDishes(replaceIngredientItem(dishes, dishIndex, ingredientIndex, value))
            }
            onChangeIngredientAmount={(value) =>
              changeDishes(replaceIngredientAmount(dishes, dishIndex, ingredientIndex, value))
            }
            onRemoveIngredient={() =>
              changeDishes(excludeIngredient(dishes, dishIndex, ingredientIndex))
            }
          />
        ))}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2 w-full text-gray-500"
        onClick={() => changeDishes(appendIngredient(dishes, dishIndex))}
      >
        <Plus className="size-3.5" />
        재료 추가
      </Button>
    </div>
  );
}

export { MealDishCard };
