'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';

import { CTAConfirmButton, Toast } from '@/commons/ui';

import { type FridgeItemWithBatches } from '@/entities/fridge-item';

import { useDeleteFridgeItemMutation, useUpdateFridgeItemMutation } from '../api/mutations';

import { type FridgeItemFormValues, FridgeItemForm } from './FridgeItemForm';

interface FridgeItemEditScreenProps {
  onClose: () => void;
  item: FridgeItemWithBatches;
}

/** 냉장고 아이템 메타 수정 화면 */
export function FridgeItemEditScreen({ onClose, item }: FridgeItemEditScreenProps) {
  const mutation = useUpdateFridgeItemMutation();
  const deleteMutation = useDeleteFridgeItemMutation();
  const formId = `fridge-item-edit-form-${item.id}`;
  const disableUnitSelect = item.fridge_item_batches.length > 0;

  function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return '재료 수정 중 오류가 발생했습니다';
  }

  function handleSubmit(values: FridgeItemFormValues) {
    mutation.mutate(
      {
        id: item.id,
        name: values.name,
        category_id: values.category_id,
        unit: values.unit,
        is_subdivided: values.is_subdivided,
      },
      {
        onSuccess: () => {
          Toast.success('재료 정보가 수정되었습니다');
          onClose();
        },
        onError: (error) => {
          Toast.error(getErrorMessage(error));
        },
      },
    );
  }

  function deleteItem() {
    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        Toast.success('재료가 삭제되었습니다');
        onClose();
      },
      onError: (error) => {
        Toast.error(getErrorMessage(error));
      },
    });
  }

  return (
    <AppScreen className="pointer-events-auto" appBar={{ title: '재료 수정' }}>
      <div className="px-4 pt-4 pb-28">
        <FridgeItemForm
          id={item.id}
          formId={formId}
          householdId={item.household_id}
          defaultValues={{
            name: item.name,
            category_id: item.category_id,
            unit: item.unit,
            is_subdivided: item.is_subdivided,
          }}
          onSubmit={handleSubmit}
          isPending={mutation.isPending}
          isDeleting={deleteMutation.isPending}
          disableUnitSelect={disableUnitSelect}
        />
      </div>
      <CTAConfirmButton>
        <CTAConfirmButton.Left
          type="button"
          color="danger"
          variant="subtle"
          disabled={Boolean(mutation.isPending || deleteMutation.isPending)}
          onClick={deleteItem}
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
