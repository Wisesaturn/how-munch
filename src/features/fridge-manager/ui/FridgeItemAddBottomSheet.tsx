'use client';

import { useState } from 'react';

import { BottomSheet, Toast } from '@/commons/ui';

import { useAddFridgeItemMutation } from '../api/mutations';

import { type FridgeBatchFormValues, FridgeBatchForm } from './FridgeBatchForm';
import { type FridgeItemFormValues, FridgeItemForm } from './FridgeItemForm';

interface FridgeItemAddBottomSheetProps {
  open: boolean;
  onClose: () => void;
  householdId: string;
  userId: string;
}

/** 냉장고 아이템 + 첫 배치 동시 추가 바텀시트 */
export function FridgeItemAddBottomSheet({
  open,
  onClose,
  householdId,
  userId,
}: FridgeItemAddBottomSheetProps) {
  const [step, setStep] = useState<'item' | 'batch'>('item');
  const [itemValues, setItemValues] = useState<FridgeItemFormValues | null>(null);
  const mutation = useAddFridgeItemMutation();
  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return '재료 추가 중 오류가 발생했습니다';
  };

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
        userId,
      },
      {
        onSuccess: () => {
          Toast.success('재료가 추가되었습니다');
          handleClose();
        },
        onError: (error) => {
          Toast.error(getErrorMessage(error));
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
    <BottomSheet open={open} onClose={handleClose}>
      <BottomSheet.Content>
        <BottomSheet.Header heading={step === 'item' ? '재료 추가' : '수량 입력'} />
        {step === 'item' ? (
          <FridgeItemForm onSubmit={handleItemSubmit} submitLabel="다음" />
        ) : (
          <FridgeBatchForm
            onSubmit={handleBatchSubmit}
            isPending={mutation.isPending}
            submitLabel="추가"
          />
        )}
      </BottomSheet.Content>
    </BottomSheet>
  );
}
