'use client';

import { Modal } from '@/commons/ui';

import { useAddIngredientMutation } from '../api/mutations';
import { useStoreNamesQuery } from '../api/queries';

import { IngredientForm, type IngredientFormValues } from './IngredientForm';

interface IngredientAddModalProps {
  open: boolean;
  onClose: () => void;
  householdId: string;
  userId: string;
  /** 검색에서 바로 추가 시 품목명 pre-fill */
  defaultName?: string;
}

export function IngredientAddModal({
  open,
  onClose,
  householdId,
  userId,
  defaultName,
}: IngredientAddModalProps) {
  const addMutation = useAddIngredientMutation();
  const { data: storeNames } = useStoreNamesQuery(householdId);

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
        onSuccess: () => onClose(),
      },
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="장보기 추가">
      <IngredientForm
        defaultValues={defaultName ? { name: defaultName } : undefined}
        storeNames={storeNames}
        onSubmit={handleSubmit}
        isSubmitting={addMutation.isPending}
        submitLabel="추가"
      />
    </Modal>
  );
}
