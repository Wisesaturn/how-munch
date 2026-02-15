'use client';

import { BottomSheet, Toast } from '@/commons/ui';

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
  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return '재고 추가 중 오류가 발생했습니다';
  };

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
          Toast.success('재고가 추가되었습니다');
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
      <BottomSheet.Header heading={`${itemName} — 재고 추가`} />
      <BottomSheet.Content>
        <FridgeBatchForm
          onSubmit={handleSubmit}
          isPending={mutation.isPending}
          submitLabel="추가"
        />
      </BottomSheet.Content>
    </BottomSheet>
  );
}
