'use client';

import { Plus, Trash2 } from 'lucide-react';

import { Button, Input, Separator } from '@/commons/ui';

import {
  appendIngredient,
  excludeDish,
  excludeIngredient,
  type IngredientUsageStatus,
  renameDish,
  replaceIngredientAmount,
  replaceIngredientBatch,
  replaceIngredientItem,
  replaceIngredientUsageStatus,
} from '../lib';
import { useMealEditorContext } from '../model';

import { MealIngredientRow } from './MealIngredientRow';

interface MealDishCardProps {
  dishIndex: number;
}

function MealDishCard({ dishIndex }: MealDishCardProps) {
  const { dishes, fridgeItems, changeDishes, openBatchSelect } =
    useMealEditorContext('MealDishCard');
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
            onIngredientItemChange={(value) => {
              let nextDishes = replaceIngredientItem(dishes, dishIndex, ingredientIndex, value);
              const selectedItem = fridgeItems.find((item) => item.id === value);

              if (!selectedItem) {
                changeDishes(nextDishes);
                return;
              }

              // 선택 품목 단위 주입
              nextDishes = nextDishes.map((currentDish, di) =>
                di !== dishIndex
                  ? currentDish
                  : {
                      ...currentDish,
                      ingredients: currentDish.ingredients.map((ing, ii) =>
                        ii !== ingredientIndex ? ing : { ...ing, unit: selectedItem.unit },
                      ),
                    },
              );

              const selectableBatches = selectedItem.fridge_item_batches.filter(
                (batch) => Number(batch.quantity) > 0,
              );
              const [firstBatch] = selectableBatches;

              // 배치가 1개뿐이면 자동 지정
              if (selectableBatches.length === 1 && firstBatch) {
                nextDishes = replaceIngredientBatch(
                  nextDishes,
                  dishIndex,
                  ingredientIndex,
                  firstBatch.id,
                );
              }

              changeDishes(nextDishes);

              // 배치가 2개 이상이면 선택 화면으로 진입
              if (selectableBatches.length >= 2 && openBatchSelect) {
                const committedDishes = nextDishes;
                openBatchSelect(value, (batchId) =>
                  changeDishes(
                    replaceIngredientBatch(committedDishes, dishIndex, ingredientIndex, batchId),
                  ),
                );
              }
            }}
            onIngredientBatchChange={(batchId) =>
              changeDishes(replaceIngredientBatch(dishes, dishIndex, ingredientIndex, batchId))
            }
            onIngredientAmountChange={(value) =>
              changeDishes(replaceIngredientAmount(dishes, dishIndex, ingredientIndex, value))
            }
            onUsageStatusChange={(status: IngredientUsageStatus) =>
              changeDishes(replaceIngredientUsageStatus(dishes, dishIndex, ingredientIndex, status))
            }
            onIngredientRemove={() =>
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
