'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { overlay } from 'overlay-kit';

import { CTAConfirmButton, DeleteConfirmBottomSheet, Toast } from '@/commons/ui';

import { type Ingredient } from '@/entities/ingredient';

import { useDeleteIngredientMutation, useUpdateIngredientMutation } from '../api/mutations';
import { useStoreNamesQuery } from '../api/queries';

import { IngredientForm, type IngredientFormValues } from './IngredientForm';

interface IngredientEditScreenProps {
  onClose: () => void;
  ingredient: Ingredient;
  householdId: string;
  onOpenProductNameSearch?: (currentName: string, onSelect: (name: string) => void) => void;
  onOpenBrandSearch?: (currentBrand: string, onSelect: (brand: string) => void) => void;
}

export function IngredientEditScreen({
  onClose,
  ingredient,
  householdId,
  onOpenProductNameSearch,
  onOpenBrandSearch,
}: IngredientEditScreenProps) {
  const updateMutation = useUpdateIngredientMutation();
  const deleteMutation = useDeleteIngredientMutation();
  const { data: storeNames } = useStoreNamesQuery(householdId);
  const formId = `ingredient-edit-form-${ingredient.id}`;

  function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return '장보기 수정 중 오류가 발생했습니다';
  }

  function handleSubmit(values: IngredientFormValues) {
    updateMutation.mutate(
      {
        id: ingredient.id,
        date: values.date,
        category_id: values.category_id,
        name: values.name,
        brand: values.brand || null,
        count: values.count,
        unit: values.unit,
        store: values.store || null,
        price: values.price,
      },
      {
        onSuccess: () => {
          Toast.success('장보기 항목이 수정되었습니다');
          onClose();
        },
        onError: (error) => {
          Toast.error(getErrorMessage(error));
        },
      },
    );
  }

  function deleteIngredient() {
    deleteMutation.mutate(ingredient.id, {
      onSuccess: () => {
        Toast.success('장보기 항목이 삭제되었습니다');
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
        deleteIngredient();
      }

      return (
        <DeleteConfirmBottomSheet
          open={isOpen}
          onClose={closeSheet}
          onConfirm={confirmDelete}
          title="상품을 삭제하시겠습니까?"
          description="삭제된 상품은 복구할 수 없습니다."
        />
      );
    });
  }

  return (
    <AppScreen className="pointer-events-auto" appBar={{ title: '상품 수정' }}>
      <div className="px-4 pt-4 pb-28">
        <IngredientForm
          id={ingredient.id}
          formId={formId}
          householdId={householdId}
          defaultValues={{
            date: ingredient.date,
            category_id: ingredient.category_id,
            name: ingredient.name,
            brand: ingredient.brand ?? '',
            count: ingredient.count,
            unit: ingredient.unit,
            store: ingredient.store ?? '',
            price: ingredient.price,
          }}
          storeNames={storeNames}
          onSubmit={handleSubmit}
          isSubmitting={updateMutation.isPending}
          isDeleting={deleteMutation.isPending}
          disableUnitSelect
          onOpenProductNameSearch={onOpenProductNameSearch}
          onOpenBrandSearch={onOpenBrandSearch}
        />
      </div>
      <CTAConfirmButton>
        <CTAConfirmButton.Left
          type="button"
          color="danger"
          variant="subtle"
          disabled={Boolean(updateMutation.isPending || deleteMutation.isPending)}
          onClick={openDeleteConfirm}
        >
          삭제
        </CTAConfirmButton.Left>
        <CTAConfirmButton.Right
          type="submit"
          form={formId}
          color="confirm"
          variant="filled"
          disabled={Boolean(updateMutation.isPending || deleteMutation.isPending)}
        >
          저장
        </CTAConfirmButton.Right>
      </CTAConfirmButton>
    </AppScreen>
  );
}
