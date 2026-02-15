'use client';

import { useState } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { Plus, Trash2 } from 'lucide-react';

import { Button, Counter, ScrollArea, Select, Toast } from '@/commons/ui';

import { type Meal, type MealType } from '@/entities/meal';

import { useUpsertMealMutation } from '../api/mutations';
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
    purchased_date: string;
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
        purchased_date: '',
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
  const hasSaveAction = meal !== null;
  const appBarTitle = `${MEAL_TYPE_LABEL[type]} 식단${hasSaveAction ? ' 편집' : ''}`;

  const [dishes, setDishes] = useState<EditorDish[]>(() => toEditorDishes(meal));

  const { data: fridgeItems = [] } = useFridgeItemsForMealQuery(householdId);
  const upsertMutation = useUpsertMealMutation();

  const handleAddDish = () => {
    setDishes((prev) => [...prev, { name: '', ingredients: [] }]);
  };

  const handleRemoveDish = (dishIndex: number) => {
    setDishes((prev) => prev.filter((_, index) => index !== dishIndex));
  };

  const handleAddIngredient = (dishIndex: number) => {
    setDishes((prev) =>
      prev.map((dish, index) =>
        index === dishIndex
          ? {
              ...dish,
              ingredients: [
                ...dish.ingredients,
                { fridge_item_id: '', purchased_date: '', amount: 0 },
              ],
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

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: appBarTitle,
        renderRight: () => (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSubmit}
            disabled={upsertMutation.isPending}
            aria-label="식단 저장"
          >
            저장
          </Button>
        ),
      }}
    >
      <ScrollArea className="h-full">
        <div className="space-y-4 p-4">
          <p className="text-xs text-gray-500">날짜: {date}</p>

          {dishes.map((dish, dishIndex) => (
            <div
              key={`${type}-dish-${dishIndex}`}
              className="rounded-lg border border-gray-200 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">
                  {dish.name.trim() || `메뉴 ${dishIndex + 1}`}
                </p>
                {dishes.length > 1 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleRemoveDish(dishIndex)}
                  >
                    <Trash2 className="size-4" />
                    삭제
                  </Button>
                ) : null}
              </div>

              <div className="mt-3 space-y-2">
                {dish.ingredients.map((ingredient, ingredientIndex) => {
                  const selectedItem = fridgeItems.find(
                    (item) => item.id === ingredient.fridge_item_id,
                  );
                  const purchasedDateOptions = selectedItem
                    ? [
                        ...new Set(
                          selectedItem.fridge_item_batches
                            .filter((batch) => Number(batch.quantity) > 0)
                            .map((batch) => batch.purchased_date),
                        ),
                      ].sort((a, b) => a.localeCompare(b))
                    : [];

                  return (
                    <div
                      key={`${type}-${dishIndex}-${ingredientIndex}`}
                      className="rounded-md border border-gray-100 p-2"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                          <label className="flex flex-col gap-1">
                            <span className="px-1 text-[11px] font-medium text-gray-500">재료</span>
                            <Select
                              value={ingredient.fridge_item_id || '__none__'}
                              onValueChange={(value) =>
                                handleIngredientChange(dishIndex, ingredientIndex, {
                                  fridge_item_id: value === '__none__' ? '' : value,
                                  purchased_date:
                                    value === '__none__'
                                      ? ''
                                      : ([
                                          ...new Set(
                                            (
                                              fridgeItems.find((item) => item.id === value)
                                                ?.fridge_item_batches ?? []
                                            )
                                              .filter((batch) => Number(batch.quantity) > 0)
                                              .map((batch) => batch.purchased_date),
                                          ),
                                        ].sort((a, b) => a.localeCompare(b))[0] ?? ''),
                                })
                              }
                            >
                              <Select.Trigger className="min-w-0">
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
                          </label>

                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9"
                            onClick={() => handleRemoveIngredient(dishIndex, ingredientIndex)}
                          >
                            삭제
                          </Button>
                        </div>

                        <div className="grid grid-cols-[1fr_1fr] gap-2">
                          <label className="flex flex-col gap-1">
                            <span className="px-1 text-[11px] font-medium text-gray-500">날짜</span>
                            <Select
                              value={ingredient.purchased_date || '__none__'}
                              onValueChange={(value) =>
                                handleIngredientChange(dishIndex, ingredientIndex, {
                                  purchased_date: value === '__none__' ? '' : value,
                                })
                              }
                              disabled={
                                !ingredient.fridge_item_id || purchasedDateOptions.length === 0
                              }
                            >
                              <Select.Trigger className="min-w-0">
                                <Select.Value placeholder="입고일 선택" />
                              </Select.Trigger>
                              <Select.Content>
                                <Select.Item value="__none__">입고일 선택</Select.Item>
                                {purchasedDateOptions.map((purchasedDate) => (
                                  <Select.Item
                                    key={`${ingredient.fridge_item_id}-${purchasedDate}`}
                                    value={purchasedDate}
                                  >
                                    {purchasedDate}
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select>
                          </label>

                          <label className="flex flex-col gap-1">
                            <span className="px-1 text-[11px] font-medium text-gray-500">수량</span>
                            <Counter
                              value={ingredient.amount}
                              min={0}
                              step={1}
                              onChange={(nextAmount) =>
                                handleIngredientChange(dishIndex, ingredientIndex, {
                                  amount: nextAmount,
                                })
                              }
                              className="w-full"
                              inputClassName="w-full"
                            />
                          </label>
                        </div>
                      </div>
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
        </div>
      </ScrollArea>
    </AppScreen>
  );
}
