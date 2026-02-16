'use client';

import { useState } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Plus, Trash2, X } from 'lucide-react';
import { z } from 'zod';

import { Button, Counter, Input, Select, Separator, Toast } from '@/commons/ui';

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

function createMealEditorSchema(maxIngredientCount: number) {
  return z
    .array(
      z.object({
        name: z.string().trim().min(1, '메뉴명을 입력해 주세요'),
        ingredients: z
          .array(
            z.object({
              fridge_item_id: z.string().trim().min(1, '재료를 선택해 주세요'),
              amount: z.number().min(1, '재료 수량은 1 이상이어야 합니다'),
            }),
          )
          .min(1, '메뉴마다 재료를 1개 이상 추가해 주세요'),
      }),
    )
    .min(1, '메뉴를 1개 이상 추가해 주세요')
    .superRefine((parsedDishes, ctx) => {
      parsedDishes.forEach((dish, dishIndex) => {
        if (dish.ingredients.length > maxIngredientCount) {
          ctx.addIssue({
            code: 'custom',
            message: `메뉴 ${dishIndex + 1}의 재료는 최대 ${maxIngredientCount}개까지 추가할 수 있습니다`,
            path: [dishIndex, 'ingredients'],
          });
        }

        const usedFridgeItemIds = new Set<string>();
        dish.ingredients.forEach((ingredient, ingredientIndex) => {
          if (usedFridgeItemIds.has(ingredient.fridge_item_id)) {
            ctx.addIssue({
              code: 'custom',
              message: `메뉴 ${dishIndex + 1}에 같은 재료를 중복으로 선택할 수 없습니다`,
              path: [dishIndex, 'ingredients', ingredientIndex, 'fridge_item_id'],
            });
            return;
          }
          usedFridgeItemIds.add(ingredient.fridge_item_id);
        });
      });
    });
}

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
  const isEditMode = meal !== null;
  const formattedDate = format(parseISO(date), 'M월 d일', { locale: ko });
  const appBarTitle = `${formattedDate} ${MEAL_TYPE_LABEL[type]} 식단`;

  const [dishes, setDishes] = useState<EditorDish[]>(() => toEditorDishes(meal));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: fridgeItems = [] } = useFridgeItemsForMealQuery(householdId);
  const upsertMutation = useUpsertMealMutation();
  const deleteMutation = useDeleteMealMutation();
  const maxIngredientCount = fridgeItems.length;
  const mealEditorSchema = createMealEditorSchema(maxIngredientCount);

  const addDish = () => {
    setDishes((prev) => [...prev, { name: '', ingredients: [] }]);
  };

  const removeDish = (dishIndex: number) => {
    setDishes((prev) => prev.filter((_, index) => index !== dishIndex));
  };

  const addIngredient = (dishIndex: number) => {
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

  const changeDishName = (dishIndex: number, name: string) => {
    setDishes((prev) =>
      prev.map((dish, index) => (index === dishIndex ? { ...dish, name } : dish)),
    );
  };

  const removeIngredient = (dishIndex: number, ingredientIndex: number) => {
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

  const changeIngredient = (
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

  const saveMeal = () => {
    const parseResult = mealEditorSchema.safeParse(dishes);
    if (!parseResult.success) {
      Toast.warn(parseResult.error.issues[0]?.message ?? '입력값을 확인해 주세요');
      return;
    }

    upsertMutation.mutate(
      { householdId, date, type, dishes: parseResult.data },
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

  const deleteMeal = () => {
    if (!meal) return;

    deleteMutation.mutate(
      { id: meal.id, householdId, date },
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

  const isMutating = upsertMutation.isPending || deleteMutation.isPending;

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: appBarTitle,
        renderRight: () => (
          <Button
            variant="ghost"
            size="sm"
            onClick={saveMeal}
            disabled={isMutating}
            aria-label="식단 저장"
          >
            저장
          </Button>
        ),
      }}
    >
      <div className="space-y-3 p-4">
        {dishes.map((dish, dishIndex) => (
          <div key={`${type}-dish-${dishIndex}`} className="rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-2">
              <Input
                value={dish.name}
                onChange={(event) => changeDishName(dishIndex, event.target.value)}
                placeholder={`메뉴 ${dishIndex + 1}`}
                className="flex-1"
              />
              {dishes.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-gray-400 hover:text-red-500"
                  onClick={() => removeDish(dishIndex)}
                  aria-label="메뉴 삭제"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>

            {dish.ingredients.length > 0 && <Separator className="my-3" />}

            <div className="space-y-2">
              {dish.ingredients.map((ingredient, ingredientIndex) => (
                <div
                  key={`${type}-${dishIndex}-${ingredientIndex}`}
                  className="flex items-center gap-2"
                >
                  <Select
                    value={ingredient.fridge_item_id || '__none__'}
                    onValueChange={(value) =>
                      changeIngredient(dishIndex, ingredientIndex, {
                        fridge_item_id: value === '__none__' ? '' : value,
                      })
                    }
                  >
                    <Select.Trigger className="min-w-0 flex-1">
                      <Select.Value placeholder="재료 선택" />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="__none__">재료 선택</Select.Item>
                      {fridgeItems.map((item) => (
                        <Select.Item key={item.id} value={item.id}>
                          {item.name} ({Number(item.total_count)}
                          {item.unit === 'count' ? '개' : 'g'})
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>

                  <Counter
                    value={ingredient.amount}
                    min={0}
                    step={1}
                    onChange={(nextAmount) =>
                      changeIngredient(dishIndex, ingredientIndex, { amount: nextAmount })
                    }
                    className="w-28 shrink-0"
                  />

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-gray-400 hover:text-red-500"
                    onClick={() => removeIngredient(dishIndex, ingredientIndex)}
                    aria-label="재료 삭제"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full text-gray-500"
              onClick={() => addIngredient(dishIndex)}
            >
              <Plus className="size-3.5" />
              재료 추가
            </Button>
          </div>
        ))}

        <Button variant="outline" className="w-full" onClick={addDish}>
          <Plus className="size-4" /> 메뉴 추가
        </Button>

        {isEditMode && (
          <>
            <Separator className="my-2" />
            {showDeleteConfirm ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="mb-3 text-center text-sm text-red-700">이 식단을 삭제하시겠습니까?</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteMutation.isPending}
                  >
                    취소
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={deleteMeal}
                    disabled={deleteMutation.isPending}
                  >
                    삭제
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full text-red-500 hover:text-red-600"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isMutating}
              >
                <Trash2 className="size-4" />
                식단 삭제
              </Button>
            )}
          </>
        )}
      </div>
    </AppScreen>
  );
}
