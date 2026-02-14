'use client';

import { BottomSheet, Toast } from '@/commons/ui';

import { type Ingredient } from '@/entities/ingredient';

import { useUpdateIngredientMutation } from '../api/mutations';
import { useStoreNamesQuery } from '../api/queries';

import { IngredientForm, type IngredientFormValues } from './IngredientForm';

interface IngredientEditBottomSheetProps {
  open: boolean;
  onClose: () => void;
  ingredient: Ingredient;
  householdId: string;
}

export function IngredientEditBottomSheet({
  open,
  onClose,
  ingredient,
  householdId,
}: IngredientEditBottomSheetProps) {
  const updateMutation = useUpdateIngredientMutation();
  const { data: storeNames } = useStoreNamesQuery(householdId);
  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return '장보기 수정 중 오류가 발생했습니다';
  };

  const handleSubmit = (values: IngredientFormValues) => {
    updateMutation.mutate(
      {
        id: ingredient.id,
        date: values.date,
        category: values.category,
        name: values.name,
        count: values.count,
        unit: values.unit,
        store: values.store || null,
        price: values.price,
      },
      {
        onSuccess: () => {
          Toast.success('장보기 항목이 수정되었습니다');
          onClose();
        },
        onError: (error) => {
          Toast.error(getErrorMessage(error));
        },
      },
    );
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheet.Content>
        <BottomSheet.Header heading="장보기 수정" />
        <IngredientForm
          defaultValues={{
            date: ingredient.date,
            category: ingredient.category,
            name: ingredient.name,
            count: ingredient.count,
            unit: ingredient.unit,
            store: ingredient.store ?? '',
            price: ingredient.price,
          }}
          storeNames={storeNames}
          onSubmit={handleSubmit}
          isSubmitting={updateMutation.isPending}
          submitLabel="수정"
        />
      </BottomSheet.Content>
    </BottomSheet>
  );
}
