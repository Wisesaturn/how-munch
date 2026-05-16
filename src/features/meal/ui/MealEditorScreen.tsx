'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { useForm } from '@tanstack/react-form';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { overlay } from 'overlay-kit';
import { z } from 'zod';

import { extractFieldErrorMessage } from '@/commons/lib';
import { Button, CTAButton, CTAConfirmButton, DeleteConfirmBottomSheet, Toast } from '@/commons/ui';

import { type Meal, type MealType } from '@/entities/meal';

import { useDeleteMealMutation, useUpsertMealMutation } from '../api/mutations';
import { useFridgeItemsForMealQuery } from '../api/queries';
import { appendDish, createFridgeStockInfoById } from '../lib';
import {
  createInUseStockAmountByItemId,
  createMealEditorDishesSchema,
  MealEditorProvider,
  toEditorDishes,
} from '../model';

import { MealDishCard } from './MealDishCard';

interface MealEditorScreenProps {
  onClose: () => void;
  householdId: string;
  date: string;
  type: MealType;
  meal: Meal | null;
  /** 재료 검색 Screen 진입 핸들러 — 선택값은 fridge_item_id로 변환되어 반영된다 */
  onOpenFridgeItemSearch?: (
    suggestions: string[],
    depletedNames: string[],
    onSelectName: (name: string) => void,
  ) => void;
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
};

export function MealEditorScreen({
  onClose,
  householdId,
  date,
  type,
  meal,
  onOpenFridgeItemSearch,
}: MealEditorScreenProps) {
  /* -------------------------------------------------------------------------- */
  /* Header Constants                                                            */
  /* -------------------------------------------------------------------------- */
  const isEditMode = meal !== null;
  const formattedDate = format(parseISO(date), 'M월 d일', { locale: ko });
  const appBarTitle = `${formattedDate} ${MEAL_LABEL_BY_TYPE[type]} 식단`;
  const initialDishes = toEditorDishes(meal);
  const selectedFridgeItemIds = [
    ...new Set(
      initialDishes.flatMap((dish) =>
        dish.ingredients.map((ingredient) => ingredient.fridge_item_id),
      ),
    ),
  ].filter(Boolean);

  const { data: fridgeItems = [] } = useFridgeItemsForMealQuery(householdId, selectedFridgeItemIds);
  const upsertMutation = useUpsertMealMutation();
  const deleteMutation = useDeleteMealMutation();

  const maxIngredientCount = fridgeItems.length;
  const fridgeStockInfoById = createFridgeStockInfoById(fridgeItems);
  const inUseStockAmountByItemId = createInUseStockAmountByItemId(initialDishes);
  const mealEditorFormSchema = z.object({
    dishes: createMealEditorDishesSchema(
      maxIngredientCount,
      fridgeStockInfoById,
      inUseStockAmountByItemId,
    ),
  });

  const form = useForm({
    defaultValues: {
      dishes: initialDishes,
    },
    validators: {
      onSubmit: mealEditorFormSchema,
      onChange: mealEditorFormSchema,
    },
    onSubmit: ({ value }) => {
      upsertMutation.mutate(
        { householdId, date, type, dishes: value.dishes, isNew: !isEditMode },
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

  function openDeleteConfirm() {
    overlay.open(({ isOpen, close, unmount }) => {
      function closeSheet() {
        close();
        window.setTimeout(unmount, 200);
      }

      function confirmDelete() {
        closeSheet();
        removeMeal();
      }

      return (
        <DeleteConfirmBottomSheet
          open={isOpen}
          onClose={closeSheet}
          onConfirm={confirmDelete}
          title="식단을 삭제하시겠습니까?"
          description="삭제된 식단은 복구할 수 없습니다."
        />
      );
    });
  }

  const isMutating = upsertMutation.isPending || deleteMutation.isPending;

  function openFridgeItemSearch(currentItemId: string, onSelectId: (id: string) => void) {
    if (!onOpenFridgeItemSearch) return;
    const suggestions = fridgeItems.map((item) => item.name);
    const depletedNames = fridgeItems
      .filter((item) => Number(item.total_count) <= 0)
      .map((item) => item.name);
    onOpenFridgeItemSearch(suggestions, depletedNames, (selectedName) => {
      const item = fridgeItems.find((i) => i.name === selectedName);
      if (item) onSelectId(item.id);
    });
  }

  return (
    <AppScreen className="pointer-events-auto" appBar={{ title: appBarTitle }}>
      <div className="space-y-3 px-4 pt-4 pb-28">
        <form.Field name="dishes">
          {(field) => (
            <MealEditorProvider
              dishes={field.state.value}
              fridgeItems={fridgeItems}
              inUseStockAmountByItemId={inUseStockAmountByItemId}
              changeDishes={field.handleChange}
              openFridgeItemSearch={onOpenFridgeItemSearch ? openFridgeItemSearch : undefined}
            >
              <div className="space-y-3">
                {field.state.value.map((_, dishIndex) => (
                  <MealDishCard key={`${type}-dish-${dishIndex}`} dishIndex={dishIndex} />
                ))}
              </div>

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
      </div>
      {isEditMode ? (
        <CTAConfirmButton>
          <CTAConfirmButton.Left
            type="button"
            color="danger"
            variant="subtle"
            onClick={openDeleteConfirm}
            disabled={isMutating}
          >
            삭제
          </CTAConfirmButton.Left>
          <CTAConfirmButton.Right
            type="button"
            color="confirm"
            variant="filled"
            onClick={saveMeal}
            disabled={isMutating}
          >
            저장
          </CTAConfirmButton.Right>
        </CTAConfirmButton>
      ) : (
        <CTAButton
          type="button"
          color="confirm"
          variant="filled"
          onClick={saveMeal}
          disabled={isMutating}
        >
          저장
        </CTAButton>
      )}
    </AppScreen>
  );
}
