'use client';

import { useMemo, useState } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { Plus, Trash2 } from 'lucide-react';

import { Button, Input, ScrollArea, Select, Toast } from '@/commons/ui';

import { type Meal, type MealType } from '@/entities/meal';

import { useDeleteMealMutation, useUpsertMealMutation } from '../api/mutations';
import { useFridgeItemsForMealQuery } from '../api/queries';

interface MealEditorScreenProps {
  onClose: () => void;
  householdId: string;
  date: string;
  type: MealType;
  meal: Meal | null;
}

interface EditorDish {
  name: string;
  ingredients: Array<{
    fridge_item_id: string;
    amount: number;
  }>;
}

const MEAL_TYPE_LABEL: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

function toEditorDishes(meal: Meal | null): EditorDish[] {
  if (!meal) return [{ name: '', ingredients: [] }];

  if (!meal.dishes.length) return [{ name: '', ingredients: [] }];

  return meal.dishes
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((dish) => ({
      name: dish.name === '[이름 없음]' ? '' : dish.name,
      ingredients: (dish.ingredients ?? []).map((ingredient) => ({
        fridge_item_id: ingredient.fridge_item_id,
        amount: Number(ingredient.amount),
      })),
    }));
}

export function MealEditorScreen({
  onClose,
  householdId,
  date,
  type,
  meal,
}: MealEditorScreenProps) {
  const [dishes, setDishes] = useState<EditorDish[]>(() => toEditorDishes(meal));

  const { data: fridgeItems = [] } = useFridgeItemsForMealQuery(householdId);
  const upsertMutation = useUpsertMealMutation();
  const deleteMutation = useDeleteMealMutation();

  const fridgeItemMap = useMemo(() => {
    return new Map(fridgeItems.map((item) => [item.id, item]));
  }, [fridgeItems]);

  const handleAddDish = () => {
    setDishes((prev) => [...prev, { name: '', ingredients: [] }]);
  };

  const handleRemoveDish = (dishIndex: number) => {
    setDishes((prev) => prev.filter((_, index) => index !== dishIndex));
  };

  const handleDishNameChange = (dishIndex: number, name: string) => {
    setDishes((prev) =>
      prev.map((dish, index) => (index === dishIndex ? { ...dish, name } : dish)),
    );
  };

  const handleAddIngredient = (dishIndex: number) => {
    setDishes((prev) =>
      prev.map((dish, index) =>
        index === dishIndex
          ? {
              ...dish,
              ingredients: [...dish.ingredients, { fridge_item_id: '', amount: 0 }],
            }
          : dish,
      ),
    );
  };

  const handleRemoveIngredient = (dishIndex: number, ingredientIndex: number) => {
    setDishes((prev) =>
      prev.map((dish, index) =>
        index === dishIndex
          ? {
              ...dish,
              ingredients: dish.ingredients.filter((_, idx) => idx !== ingredientIndex),
            }
          : dish,
      ),
    );
  };

  const handleIngredientChange = (
    dishIndex: number,
    ingredientIndex: number,
    patch: Partial<EditorDish['ingredients'][number]>,
  ) => {
    setDishes((prev) =>
      prev.map((dish, index) => {
        if (index !== dishIndex) return dish;

        return {
          ...dish,
          ingredients: dish.ingredients.map((ingredient, idx) =>
            idx === ingredientIndex ? { ...ingredient, ...patch } : ingredient,
          ),
        };
      }),
    );
  };

  const handleSubmit = () => {
    upsertMutation.mutate(
      {
        householdId,
        date,
        type,
        dishes,
      },
      {
        onSuccess: () => {
          Toast.success('식단이 저장되었습니다');
          onClose();
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : '식단 저장에 실패했습니다';
          Toast.error(message);
        },
      },
    );
  };

  const handleDeleteMeal = () => {
    if (!meal) return;

    deleteMutation.mutate(
      { id: meal.id },
      {
        onSuccess: () => {
          Toast.success('식단이 삭제되었습니다');
          onClose();
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : '식단 삭제에 실패했습니다';
          Toast.error(message);
        },
      },
    );
  };

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{ title: `${MEAL_TYPE_LABEL[type]} 식단 편집` }}
    >
      <ScrollArea className="h-full">
        <div className="space-y-4 p-4">
          <p className="text-xs text-gray-500">날짜: {date}</p>

          {dishes.map((dish, dishIndex) => (
            <div
              key={`${type}-dish-${dishIndex}`}
              className="rounded-lg border border-gray-200 p-3"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={dish.name}
                  onChange={(event) => handleDishNameChange(dishIndex, event.target.value)}
                  placeholder="메뉴명 (예: 김치찌개)"
                />
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => handleRemoveDish(dishIndex)}
                  disabled={dishes.length === 1}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                {dish.ingredients.map((ingredient, ingredientIndex) => {
                  const selected = ingredient.fridge_item_id
                    ? fridgeItemMap.get(ingredient.fridge_item_id)
                    : null;

                  return (
                    <div key={`${type}-${dishIndex}-${ingredientIndex}`} className="flex gap-2">
                      <Select
                        value={ingredient.fridge_item_id || '__none__'}
                        onValueChange={(value) =>
                          handleIngredientChange(dishIndex, ingredientIndex, {
                            fridge_item_id: value === '__none__' ? '' : value,
                          })
                        }
                      >
                        <Select.Trigger>
                          <Select.Value placeholder="재료 선택" />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="__none__">재료 선택</Select.Item>
                          {fridgeItems.map((item) => (
                            <Select.Item key={item.id} value={item.id}>
                              {item.name} ({Number(item.total_count)}{' '}
                              {item.unit === 'count' ? '개' : 'g'})
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select>

                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={ingredient.amount}
                        onChange={(event) =>
                          handleIngredientChange(dishIndex, ingredientIndex, {
                            amount: Number(event.target.value),
                          })
                        }
                        placeholder={selected?.unit === 'g' ? 'g' : '개'}
                        className="w-24"
                      />

                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => handleRemoveIngredient(dishIndex, ingredientIndex)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleAddIngredient(dishIndex)}
                >
                  재료 추가
                </Button>
              </div>
            </div>
          ))}

          <Button variant="outline" className="w-full" onClick={handleAddDish}>
            <Plus className="mr-1 size-4" /> 메뉴 추가
          </Button>

          {meal && (
            <Button
              variant="outline"
              className="w-full text-red-600 hover:text-red-700"
              onClick={handleDeleteMeal}
              disabled={deleteMutation.isPending}
            >
              식단 삭제
            </Button>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={upsertMutation.isPending || deleteMutation.isPending}
          >
            {upsertMutation.isPending ? '저장 중...' : '저장'}
          </Button>
        </div>
      </ScrollArea>
    </AppScreen>
  );
}
