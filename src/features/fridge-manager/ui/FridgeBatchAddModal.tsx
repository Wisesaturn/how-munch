'use client';

import { Modal } from '@/commons/ui';

import { useAddBatchMutation } from '../api/mutations';

import { type FridgeBatchFormValues, FridgeBatchForm } from './FridgeBatchForm';

interface FridgeBatchAddModalProps {
  open: boolean;
  onClose: () => void;
  fridgeItemId: string;
  itemName: string;
}

/** 기존 아이템에 배치 추가 모달 */
export function FridgeBatchAddModal({
  open,
  onClose,
  fridgeItemId,
  itemName,
}: FridgeBatchAddModalProps) {
  const mutation = useAddBatchMutation();

  const handleSubmit = (values: FridgeBatchFormValues) => {
    mutation.mutate(
      {
        fridge_item_id: fridgeItemId,
        quantity: values.quantity,
        expiry_date: values.expiry_date || null,
        purchased_date: values.purchased_date,
        memo: values.memo || null,
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={`${itemName} — 재고 추가`}>
      <FridgeBatchForm onSubmit={handleSubmit} isPending={mutation.isPending} submitLabel="추가" />
    </Modal>
  );
}
