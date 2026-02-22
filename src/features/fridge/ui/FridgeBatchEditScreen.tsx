'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';

import { CTAConfirmButton, Toast } from '@/commons/ui';

import { type FridgeItemBatch } from '@/entities/fridge-item';
import { type IngredientUnit } from '@/entities/ingredient';

import { useDeleteBatchMutation, useUpdateBatchMutation } from '../api/mutations';
import { useBatchUsedAmountQuery } from '../api/queries';

import { type FridgeBatchFormValues, FridgeBatchForm } from './FridgeBatchForm';

interface FridgeBatchEditScreenProps {
  onClose: () => void;
  batch: FridgeItemBatch;
  unit: IngredientUnit;
  fromStore: boolean;
}

/** 냉장고 배치 수정 화면 */
export function FridgeBatchEditScreen({
  onClose,
  batch,
  unit,
  fromStore,
}: FridgeBatchEditScreenProps) {
  const mutation = useUpdateBatchMutation();
  const deleteMutation = useDeleteBatchMutation();
  const { data: usedAmount = 0 } = useBatchUsedAmountQuery(batch.id);
  const formId = `fridge-batch-edit-form-${batch.id}`;
  const totalQuantity = Number(batch.quantity) + Number(usedAmount);
  const quantityUnitLabel = unit === 'count' ? '개' : unit;

  function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return '재고 수정 중 오류가 발생했습니다';
  }

  function handleSubmit(values: FridgeBatchFormValues) {
    mutation.mutate(
      {
        id: batch.id,
        expiry_date: values.expiry_date || null,
        purchased_date: values.purchased_date,
        memo: values.memo || null,
        quantity: fromStore ? undefined : values.quantity,
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

  function deleteBatch() {
    if (!window.confirm('이 재고를 삭제하시겠습니까?')) return;

    deleteMutation.mutate(batch.id, {
      onSuccess: () => {
        Toast.success('재고가 삭제되었습니다');
        onClose();
      },
      onError: (error) => {
        Toast.error(getErrorMessage(error));
      },
    });
  }

  return (
    <AppScreen className="pointer-events-auto" appBar={{ title: '재고 수정' }}>
      <div className="px-4 pt-4 pb-28">
        <FridgeBatchForm
          id={batch.id}
          formId={formId}
          defaultValues={{
            quantity: totalQuantity,
            expiry_date: batch.expiry_date ?? '',
            purchased_date: batch.purchased_date,
            memo: batch.memo ?? '',
          }}
          quantityMin={usedAmount}
          quantityUnitLabel={quantityUnitLabel}
          quantityUnit={unit}
          disableQuantityEdit={fromStore}
          onSubmit={handleSubmit}
          isPending={mutation.isPending}
          isDeleting={deleteMutation.isPending}
        />
      </div>
      <CTAConfirmButton>
        <CTAConfirmButton.Left
          type="button"
          color="danger"
          variant="subtle"
          disabled={Boolean(mutation.isPending || deleteMutation.isPending)}
          onClick={deleteBatch}
        >
          삭제
        </CTAConfirmButton.Left>
        <CTAConfirmButton.Right
          type="submit"
          form={formId}
          color="confirm"
          variant="filled"
          disabled={Boolean(mutation.isPending || deleteMutation.isPending)}
        >
          저장
        </CTAConfirmButton.Right>
      </CTAConfirmButton>
    </AppScreen>
  );
}
