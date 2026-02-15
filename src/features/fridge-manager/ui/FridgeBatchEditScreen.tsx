'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';

import { ScrollArea, Toast } from '@/commons/ui';

import { type FridgeItemBatch } from '@/entities/fridge-item';

import { useUpdateBatchMutation } from '../api/mutations';

import { type FridgeBatchFormValues, FridgeBatchForm } from './FridgeBatchForm';

interface FridgeBatchEditScreenProps {
  onClose: () => void;
  batch: FridgeItemBatch;
  itemName: string;
  usedAmount: number;
}

/** 냉장고 배치 수정 화면 */
export function FridgeBatchEditScreen({
  onClose,
  batch,
  itemName,
  usedAmount,
}: FridgeBatchEditScreenProps) {
  const mutation = useUpdateBatchMutation();
  const totalQuantity = Number(batch.quantity) + Number(usedAmount);

  function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return '재고 수정 중 오류가 발생했습니다';
  }

  function handleSubmit(values: FridgeBatchFormValues) {
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
          Toast.success('재고가 수정되었습니다');
          onClose();
        },
        onError: (error) => {
          Toast.error(getErrorMessage(error));
        },
      },
    );
  }

  return (
    <AppScreen className="pointer-events-auto" appBar={{ title: `${itemName} — 재고 수정` }}>
      <ScrollArea className="h-full">
        <div className="p-4">
          <p className="mb-3 text-xs text-gray-500">
            식단 사용량 {usedAmount}
            {usedAmount > 0 ? ` · 최소 입력 ${usedAmount}` : ''}
          </p>
          <FridgeBatchForm
            defaultValues={{
              quantity: totalQuantity,
              expiry_date: batch.expiry_date ?? '',
              purchased_date: batch.purchased_date,
              memo: batch.memo ?? '',
            }}
            onSubmit={handleSubmit}
            isPending={mutation.isPending}
          />
        </div>
      </ScrollArea>
    </AppScreen>
  );
}
