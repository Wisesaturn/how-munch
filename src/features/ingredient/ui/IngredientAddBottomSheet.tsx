'use client';

import { BottomSheet, Toast } from '@/commons/ui';

import { useAddIngredientMutation } from '../api/mutations';
import { useStoreNamesQuery } from '../api/queries';

import { IngredientForm, type IngredientFormValues } from './IngredientForm';

interface IngredientAddBottomSheetProps {
  open: boolean;
  onClose: () => void;
  householdId: string;
  userId: string;
  /** 검색에서 바로 추가 시 품목명 pre-fill */
  defaultName?: string;
}

export function IngredientAddBottomSheet({
  open,
  onClose,
  householdId,
  userId,
  defaultName,
}: IngredientAddBottomSheetProps) {
  const addMutation = useAddIngredientMutation();
  const { data: storeNames } = useStoreNamesQuery(householdId);
  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return '장보기 추가 중 오류가 발생했습니다';
  };

  const handleSubmit = (values: IngredientFormValues) => {
    addMutation.mutate(
      {
        household_id: householdId,
        user_id: userId,
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
          Toast.success('장보기 항목이 추가되었습니다');
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
        <BottomSheet.Header heading="장보기 추가" />
        <IngredientForm
          defaultValues={defaultName ? { name: defaultName } : undefined}
          storeNames={storeNames}
          onSubmit={handleSubmit}
          isSubmitting={addMutation.isPending}
          submitLabel="추가"
        />
      </BottomSheet.Content>
    </BottomSheet>
  );
}
