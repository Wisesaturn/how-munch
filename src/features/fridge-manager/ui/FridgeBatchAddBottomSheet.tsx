'use client';

import { BottomSheet } from '@/commons/ui';

import { useAddBatchMutation } from '../api/mutations';

import { type FridgeBatchFormValues, FridgeBatchForm } from './FridgeBatchForm';

interface FridgeBatchAddBottomSheetProps {
  open: boolean;
  onClose: () => void;
  fridgeItemId: string;
  itemName: string;
}

/** 기존 아이템에 배치 추가 바텀시트 */
export function FridgeBatchAddBottomSheet({
  open,
  onClose,
  fridgeItemId,
  itemName,
}: FridgeBatchAddBottomSheetProps) {
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
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheet.Content>
        <BottomSheet.Header heading={`${itemName} — 재고 추가`} />
        <FridgeBatchForm
          onSubmit={handleSubmit}
          isPending={mutation.isPending}
          submitLabel="추가"
        />
      </BottomSheet.Content>
    </BottomSheet>
  );
}
