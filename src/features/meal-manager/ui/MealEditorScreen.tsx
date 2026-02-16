'use client';

import { useState } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { useForm } from '@tanstack/react-form';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';

import { extractFieldErrorMessage } from '@/commons/lib';
import { Button, Separator, Toast } from '@/commons/ui';

import { type Meal, type MealType } from '@/entities/meal';

import { useDeleteMealMutation, useUpsertMealMutation } from '../api/mutations';
import { useFridgeItemsForMealQuery } from '../api/queries';
import { appendDish, createFridgeStockInfoById } from '../lib';
import { createMealEditorDishesSchema, MealEditorProvider, toEditorDishes } from '../model';

import { MealDishCard } from './MealDishCard';

interface MealEditorScreenProps {
  onClose: () => void;
  householdId: string;
  date: string;
  type: MealType;
  meal: Meal | null;
}

const MEAL_LABEL_BY_TYPE: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

/* -------------------------------------------------------------------------- */
/* View Constants                                                              */
/* -------------------------------------------------------------------------- */
const ALERT_MSG = {
  saveSuccess: '식단이 저장되었습니다',
  saveFailed: '식단 저장에 실패했습니다',
  deleteSuccess: '식단이 삭제되었습니다',
  deleteFailed: '식단 삭제에 실패했습니다',
  invalidFallback: '입력값을 확인해 주세요',
  deleteConfirm: '이 식단을 삭제하시겠습니까?',
};

export function MealEditorScreen({
  onClose,
  householdId,
  date,
  type,
  meal,
}: MealEditorScreenProps) {
  /* -------------------------------------------------------------------------- */
  /* Header Constants                                                            */
  /* -------------------------------------------------------------------------- */
  const isEditMode = meal !== null;
  const formattedDate = format(parseISO(date), 'M월 d일', { locale: ko });
  const appBarTitle = `${formattedDate} ${MEAL_LABEL_BY_TYPE[type]} 식단`;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: fridgeItems = [] } = useFridgeItemsForMealQuery(householdId);
  const upsertMutation = useUpsertMealMutation();
  const deleteMutation = useDeleteMealMutation();

  const maxIngredientCount = fridgeItems.length;
  const fridgeStockInfoById = createFridgeStockInfoById(fridgeItems);
  const mealEditorFormSchema = z.object({
    dishes: createMealEditorDishesSchema(maxIngredientCount, fridgeStockInfoById),
  });

  const form = useForm({
    defaultValues: {
      dishes: toEditorDishes(meal),
    },
    validators: {
      onSubmit: mealEditorFormSchema,
      onChange: mealEditorFormSchema,
    },
    onSubmit: ({ value }) => {
      upsertMutation.mutate(
        { householdId, date, type, dishes: value.dishes },
        {
          onSuccess: () => {
            Toast.success(ALERT_MSG.saveSuccess);
            onClose();
          },
          onError: (error) => {
            const errorMessage = error instanceof Error ? error.message : ALERT_MSG.saveFailed;
            Toast.error(errorMessage);
          },
        },
      );
    },
    onSubmitInvalid: ({ formApi }) => {
      const parseResult = mealEditorFormSchema.safeParse({ dishes: formApi.state.values.dishes });
      const detailedMessage = !parseResult.success
        ? extractFieldErrorMessage(parseResult.error.issues)
        : undefined;
      const submitMessage = extractFieldErrorMessage(formApi.state.errorMap.onSubmit);
      const changeMessage = extractFieldErrorMessage(formApi.state.errorMap.onChange);

      Toast.warn(
        String(detailedMessage ?? submitMessage ?? changeMessage ?? ALERT_MSG.invalidFallback),
      );
    },
  });

  function saveMeal() {
    form.handleSubmit();
  }

  function removeMeal() {
    if (!meal) return;

    deleteMutation.mutate(
      { id: meal.id, householdId, date },
      {
        onSuccess: () => {
          Toast.success(ALERT_MSG.deleteSuccess);
          onClose();
        },
        onError: (error) => {
          const errorMessage = error instanceof Error ? error.message : ALERT_MSG.deleteFailed;
          Toast.error(errorMessage);
        },
      },
    );
  }

  const isMutating = upsertMutation.isPending || deleteMutation.isPending;

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: appBarTitle,
        renderRight: () => (
          <Button
            type="button"
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
        <form.Field name="dishes">
          {(field) => (
            <MealEditorProvider
              dishes={field.state.value}
              fridgeItems={fridgeItems}
              changeDishes={field.handleChange}
            >
              {field.state.value.map((_, dishIndex) => (
                <MealDishCard key={`${type}-dish-${dishIndex}`} dishIndex={dishIndex} />
              ))}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => field.handleChange(appendDish(field.state.value))}
              >
                <Plus className="size-4" /> 메뉴 추가
              </Button>
            </MealEditorProvider>
          )}
        </form.Field>

        {isEditMode ? (
          <>
            <Separator className="my-2" />
            {showDeleteConfirm ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="mb-3 text-center text-sm text-red-700">{ALERT_MSG.deleteConfirm}</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteMutation.isPending}
                  >
                    취소
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1"
                    onClick={removeMeal}
                    disabled={deleteMutation.isPending}
                  >
                    삭제
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
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
        ) : null}
      </div>
    </AppScreen>
  );
}
