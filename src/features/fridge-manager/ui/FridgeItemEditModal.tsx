'use client';

import { BottomSheet } from '@/commons/ui';

import { type FridgeItemWithBatches } from '@/entities/fridge-item';

import { useUpdateFridgeItemMutation } from '../api/mutations';

import { type FridgeItemFormValues, FridgeItemForm } from './FridgeItemForm';

interface FridgeItemEditModalProps {
  open: boolean;
  onClose: () => void;
  item: FridgeItemWithBatches;
}

/** 냉장고 아이템 메타 수정 모달 */
export function FridgeItemEditModal({ open, onClose, item }: FridgeItemEditModalProps) {
  const mutation = useUpdateFridgeItemMutation();

  const handleSubmit = (values: FridgeItemFormValues) => {
    mutation.mutate(
      {
        id: item.id,
        name: values.name,
        category: values.category,
        unit: values.unit,
        is_subdivided: values.is_subdivided,
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="재료 수정">
      <FridgeItemForm
        defaultValues={{
          name: item.name,
          category: item.category,
          unit: item.unit,
          is_subdivided: item.is_subdivided,
        }}
        onSubmit={handleSubmit}
        isPending={mutation.isPending}
      />
    </BottomSheet>
  );
}
