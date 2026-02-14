'use client';

import { useState } from 'react';

import { Modal } from '@/commons/ui';

import { useAddFridgeItemMutation } from '../api/mutations';

import { type FridgeBatchFormValues, FridgeBatchForm } from './FridgeBatchForm';
import { type FridgeItemFormValues, FridgeItemForm } from './FridgeItemForm';

interface FridgeItemAddModalProps {
  open: boolean;
  onClose: () => void;
  householdId: string;
}

/** 냉장고 아이템 + 첫 배치 동시 추가 모달 */
export function FridgeItemAddModal({ open, onClose, householdId }: FridgeItemAddModalProps) {
  const [step, setStep] = useState<'item' | 'batch'>('item');
  const [itemValues, setItemValues] = useState<FridgeItemFormValues | null>(null);
  const mutation = useAddFridgeItemMutation();

  const handleItemSubmit = (values: FridgeItemFormValues) => {
    setItemValues(values);
    setStep('batch');
  };

  const handleBatchSubmit = (batchValues: FridgeBatchFormValues) => {
    if (!itemValues) return;

    mutation.mutate(
      {
        item: {
          household_id: householdId,
          name: itemValues.name,
          category: itemValues.category,
          unit: itemValues.unit,
          is_subdivided: itemValues.is_subdivided,
        },
        batch: {
          quantity: batchValues.quantity,
          expiry_date: batchValues.expiry_date || null,
          purchased_date: batchValues.purchased_date,
          memo: batchValues.memo || null,
        },
      },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  };

  const handleClose = () => {
    setStep('item');
    setItemValues(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={step === 'item' ? '재료 추가' : '수량 입력'}>
      {step === 'item' ? (
        <FridgeItemForm onSubmit={handleItemSubmit} submitLabel="다음" />
      ) : (
        <FridgeBatchForm
          onSubmit={handleBatchSubmit}
          isPending={mutation.isPending}
          submitLabel="추가"
        />
      )}
    </Modal>
  );
}
