'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { josa } from 'es-hangul';
import { overlay } from 'overlay-kit';

import { CTAConfirmButton, DeleteConfirmBottomSheet, Toast } from '@/commons/ui';

import { type FridgeItemBatch } from '@/entities/fridge-item';
import {
  formatIngredientAmount,
  normalizeAmountByUnit,
  type IngredientUnit,
} from '@/entities/ingredient';

import {
  useDeleteBatchMutation,
  useDiscardBatchMutation,
  useUpdateBatchMutation,
} from '../api/mutations';
import { useBatchUsedAmountQuery } from '../api/queries';

import { type FridgeBatchFormValues, FridgeBatchForm } from './FridgeBatchForm';

interface FridgeBatchEditScreenProps {
  onClose: () => void;
  batch: FridgeItemBatch;
  unit: IngredientUnit;
}

/** 냉장고 배치 수정 화면 */
export function FridgeBatchEditScreen({ onClose, batch, unit }: FridgeBatchEditScreenProps) {
  const mutation = useUpdateBatchMutation();
  const deleteMutation = useDeleteBatchMutation();
  const discardMutation = useDiscardBatchMutation();
  const { data: batchUsage } = useBatchUsedAmountQuery(batch.id);
  const usedAmount = batchUsage?.usedAmount ?? 0;
  const isInMeal = batchUsage?.hasUsage ?? false;
  const formId = `fridge-batch-edit-form-${batch.id}`;
  const isFromGrocery = batch.is_from_grocery === true;
  const initialQuantity = Number(batch.initial_quantity);
  // kg/l는 소수 연산 오차로 상한이 0.2가 아닌 0.19999... 가 되지 않도록 정규화한다.
  const quantityMax = normalizeAmountByUnit(initialQuantity - usedAmount, unit);
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
        purchased_date: isFromGrocery ? undefined : values.purchased_date,
        memo: values.memo || null,
        current_quantity: values.quantity,
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

  function discardBatch() {
    discardMutation.mutate(batch.id, {
      onSuccess: () => {
        Toast.success('재고를 전부 버렸습니다');
        onClose();
      },
      onError: (error) => {
        Toast.error(getErrorMessage(error));
      },
    });
  }

  function openDeleteConfirm() {
    overlay.open(({ isOpen, close, unmount }) => {
      function closeSheet() {
        close();
        window.setTimeout(unmount, 200);
      }

      function confirmDelete() {
        closeSheet();
        deleteBatch();
      }

      return (
        <DeleteConfirmBottomSheet
          open={isOpen}
          onClose={closeSheet}
          onConfirm={confirmDelete}
          title="재고를 삭제하시겠습니까?"
          description="삭제된 재고는 복구할 수 없습니다."
        />
      );
    });
  }

  function openDiscardConfirm() {
    overlay.open(({ isOpen, close, unmount }) => {
      function closeSheet() {
        close();
        window.setTimeout(unmount, 200);
      }

      function confirmDiscard() {
        closeSheet();
        discardBatch();
      }

      return (
        <DeleteConfirmBottomSheet
          open={isOpen}
          onClose={closeSheet}
          onConfirm={confirmDiscard}
          title="재고를 전부 버리시겠습니까?"
          description="버린 재고는 복구할 수 없습니다."
          confirmLabel="전부 버리기"
        />
      );
    });
  }

  return (
    <AppScreen className="pointer-events-auto" appBar={{ title: '재고 수정' }}>
      <div className="px-4 pt-4 pb-28">
        <FridgeBatchForm
          id={batch.id}
          formId={formId}
          defaultValues={{
            quantity: Number(batch.quantity),
            expiry_date: batch.expiry_date ?? '',
            purchased_date: batch.purchased_date,
            memo: batch.memo ?? '',
          }}
          quantityMin={0}
          quantityMax={quantityMax}
          quantityUnitLabel={quantityUnitLabel}
          quantityUnit={unit}
          quantityHint={
            usedAmount > 0
              ? `식단에서 사용한 ${josa(formatIngredientAmount(usedAmount, unit, true), '은/는')} 현재 수량에 포함되지 않습니다.`
              : undefined
          }
          initialQuantityLabel={formatIngredientAmount(initialQuantity, unit, true)}
          purchasedDateLockedHint={
            isFromGrocery
              ? '장보기에서 등록한 재고의 구매일과 등록 수량은 장보기에서 변경할 수 있습니다.'
              : undefined
          }
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
          onClick={isInMeal ? openDiscardConfirm : openDeleteConfirm}
        >
          {isInMeal ? '버리기' : '삭제'}
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
