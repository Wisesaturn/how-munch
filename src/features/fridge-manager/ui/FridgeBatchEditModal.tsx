'use client';

import { BottomSheet } from '@/commons/ui';

import { type FridgeItemBatch } from '@/entities/fridge-item';

import { useUpdateBatchMutation } from '../api/mutations';

import { type FridgeBatchFormValues, FridgeBatchForm } from './FridgeBatchForm';

interface FridgeBatchEditModalProps {
  open: boolean;
  onClose: () => void;
  batch: FridgeItemBatch;
  itemName: string;
}

/** 배치 수정 모달 */
export function FridgeBatchEditModal({
  open,
  onClose,
  batch,
  itemName,
}: FridgeBatchEditModalProps) {
  const mutation = useUpdateBatchMutation();

  const handleSubmit = (values: FridgeBatchFormValues) => {
    mutation.mutate(
      {
        id: batch.id,
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
    <BottomSheet open={open} onClose={onClose} title={`${itemName} — 재고 수정`}>
      <FridgeBatchForm
        defaultValues={{
          quantity: batch.quantity,
          expiry_date: batch.expiry_date ?? '',
          purchased_date: batch.purchased_date,
          memo: batch.memo ?? '',
        }}
        onSubmit={handleSubmit}
        isPending={mutation.isPending}
      />
    </BottomSheet>
  );
}
