'use client';

import { BottomSheet } from '@/commons/ui';

import { type Ingredient } from '@/entities/ingredient';

import { useUpdateIngredientMutation } from '../api/mutations';
import { useStoreNamesQuery } from '../api/queries';

import { IngredientForm, type IngredientFormValues } from './IngredientForm';

interface IngredientEditModalProps {
  open: boolean;
  onClose: () => void;
  ingredient: Ingredient;
  householdId: string;
}

export function IngredientEditModal({
  open,
  onClose,
  ingredient,
  householdId,
}: IngredientEditModalProps) {
  const updateMutation = useUpdateIngredientMutation();
  const { data: storeNames } = useStoreNamesQuery(householdId);

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
        onSuccess: () => onClose(),
      },
    );
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="장보기 수정">
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
    </BottomSheet>
  );
}
