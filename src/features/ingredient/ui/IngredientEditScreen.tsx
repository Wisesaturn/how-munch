'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';

import { ScrollArea, Toast } from '@/commons/ui';

import { type Ingredient } from '@/entities/ingredient';

import { useDeleteIngredientMutation, useUpdateIngredientMutation } from '../api/mutations';
import { useStoreNamesQuery } from '../api/queries';

import { IngredientForm, type IngredientFormValues } from './IngredientForm';

interface IngredientEditScreenProps {
  onClose: () => void;
  ingredient: Ingredient;
  householdId: string;
}

export function IngredientEditScreen({
  onClose,
  ingredient,
  householdId,
}: IngredientEditScreenProps) {
  const updateMutation = useUpdateIngredientMutation();
  const deleteMutation = useDeleteIngredientMutation();
  const { data: storeNames } = useStoreNamesQuery(householdId);

  function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return '장보기 수정 중 오류가 발생했습니다';
  }

  function handleSubmit(values: IngredientFormValues) {
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
  }

  function deleteIngredient() {
    if (!window.confirm(`'${ingredient.name}' 항목을 삭제할까요?`)) return;

    deleteMutation.mutate(ingredient.id, {
      onSuccess: () => {
        Toast.success('장보기 항목이 삭제되었습니다');
        onClose();
      },
      onError: (error) => {
        Toast.error(getErrorMessage(error));
      },
    });
  }

  return (
    <AppScreen className="pointer-events-auto" appBar={{ title: '상품 수정' }}>
      <ScrollArea className="h-full">
        <div className="p-4">
          <IngredientForm
            id={ingredient.id}
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
            onDelete={deleteIngredient}
            isSubmitting={updateMutation.isPending}
            isDeleting={deleteMutation.isPending}
          />
        </div>
      </ScrollArea>
    </AppScreen>
  );
}
