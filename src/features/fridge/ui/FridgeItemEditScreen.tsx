'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { overlay } from 'overlay-kit';

import { Button, CTAConfirmButton, DeleteConfirmBottomSheet, Toast } from '@/commons/ui';

import { type FridgeItemWithBatches } from '@/entities/fridge-item';

import {
  useDeleteFridgeItemMutation,
  useDiscardFridgeItemMutation,
  useUpdateFridgeItemMutation,
} from '../api/mutations';

import { type FridgeItemFormValues, FridgeItemForm } from './FridgeItemForm';

interface FridgeItemEditScreenProps {
  onClose: () => void;
  item: FridgeItemWithBatches;
  onOpenSubdivide?: () => void;
  onOpenProductNameSearch?: (currentName: string, onSelect: (name: string) => void) => void;
  onOpenBrandSearch?: (currentBrand: string, onSelect: (brand: string) => void) => void;
}

/** 냉장고 아이템 메타 수정 화면 */
export function FridgeItemEditScreen({
  onClose,
  item,
  onOpenSubdivide,
  onOpenProductNameSearch,
  onOpenBrandSearch,
}: FridgeItemEditScreenProps) {
  const mutation = useUpdateFridgeItemMutation();
  const deleteMutation = useDeleteFridgeItemMutation();
  const discardMutation = useDiscardFridgeItemMutation();
  const formId = `fridge-item-edit-form-${item.id}`;
  const disableUnitSelect = item.fridge_item_batches.length > 0;
  const isInMeal = (item.meal_batch_usages?.length ?? 0) > 0;

  function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return '재료 수정 중 오류가 발생했습니다';
  }

  function handleSubmit(values: FridgeItemFormValues) {
    mutation.mutate(
      {
        id: item.id,
        name: values.name,
        brand: values.brand || null,
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

  function discardItem() {
    discardMutation.mutate(item.id, {
      onSuccess: () => {
        Toast.success('재료를 전부 버렸습니다');
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
        deleteItem();
      }

      return (
        <DeleteConfirmBottomSheet
          open={isOpen}
          onClose={closeSheet}
          onConfirm={confirmDelete}
          title="재료를 삭제하시겠습니까?"
          description="삭제된 재료는 복구할 수 없습니다."
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
        discardItem();
      }

      return (
        <DeleteConfirmBottomSheet
          open={isOpen}
          onClose={closeSheet}
          onConfirm={confirmDiscard}
          title="재료를 전부 버리시겠습니까?"
          description="버린 재료는 복구할 수 없습니다."
          confirmLabel="전부 버리기"
        />
      );
    });
  }

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: '재료 수정',
        renderRight: () =>
          onOpenSubdivide ? (
            <Button type="button" variant="ghost" size="sm" onClick={onOpenSubdivide}>
              소분
            </Button>
          ) : null,
      }}
    >
      <div className="px-4 pt-4 pb-28">
        <FridgeItemForm
          id={item.id}
          formId={formId}
          householdId={item.household_id}
          defaultValues={{
            name: item.name,
            brand: item.brand ?? '',
            category_id: item.category_id,
            unit: item.unit,
            is_subdivided: item.is_subdivided,
          }}
          onSubmit={handleSubmit}
          isPending={mutation.isPending}
          isDeleting={deleteMutation.isPending}
          disableUnitSelect={disableUnitSelect}
          onOpenProductNameSearch={onOpenProductNameSearch}
          onOpenBrandSearch={onOpenBrandSearch}
        />
      </div>
      <CTAConfirmButton>
        <CTAConfirmButton.Left
          type="button"
          color="danger"
          variant="subtle"
          disabled={Boolean(
            mutation.isPending || deleteMutation.isPending || discardMutation.isPending,
          )}
          onClick={isInMeal ? openDiscardConfirm : openDeleteConfirm}
        >
          {isInMeal ? '버리기' : '삭제'}
        </CTAConfirmButton.Left>
        <CTAConfirmButton.Right
          type="submit"
          form={formId}
          color="confirm"
          variant="filled"
          disabled={Boolean(
            mutation.isPending || deleteMutation.isPending || discardMutation.isPending,
          )}
        >
          저장
        </CTAConfirmButton.Right>
      </CTAConfirmButton>
    </AppScreen>
  );
}
