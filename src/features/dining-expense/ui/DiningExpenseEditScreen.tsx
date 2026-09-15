'use client';

import { useState } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { overlay } from 'overlay-kit';

import { CTAConfirmButton, DeleteConfirmBottomSheet, Toast } from '@/commons/ui';

import { type DiningExpense, type DiningExpenseKind } from '@/entities/dining-expense';

import { useDeleteDiningExpenseMutation, useUpdateDiningExpenseMutation } from '../api/mutations';
import { useDiningExpenseSuggestionsQuery } from '../api/queries';

import { DiningExpenseForm, type DiningExpenseFormValues } from './DiningExpenseForm';

interface DiningExpenseEditScreenProps {
  onClose: () => void;
  householdId: string;
  expense: DiningExpense;
}

export function DiningExpenseEditScreen({
  onClose,
  householdId,
  expense,
}: DiningExpenseEditScreenProps) {
  const [kind, setKind] = useState<DiningExpenseKind>(expense.kind);
  const updateMutation = useUpdateDiningExpenseMutation();
  const deleteMutation = useDeleteDiningExpenseMutation();
  const { data: brandNames } = useDiningExpenseSuggestionsQuery(householdId, 'brand', kind);
  const { data: storeNames } = useDiningExpenseSuggestionsQuery(householdId, 'store', 'delivery');
  const formId = `dining-expense-edit-form-${expense.id}`;
  const isPending = updateMutation.isPending || deleteMutation.isPending;

  function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return '외식비 수정 중 오류가 발생했습니다';
  }

  function handleSubmit(values: DiningExpenseFormValues) {
    updateMutation.mutate(
      {
        id: expense.id,
        date: values.date,
        kind: values.kind,
        brand: values.brand,
        name: values.name || null,
        store: values.store || null,
        price: values.price,
        memo: values.memo || null,
      },
      {
        onSuccess: () => {
          Toast.success('외식비가 수정되었습니다');
          onClose();
        },
        onError: (error) => {
          Toast.error(getErrorMessage(error));
        },
      },
    );
  }

  function deleteDiningExpense() {
    deleteMutation.mutate(expense.id, {
      onSuccess: () => {
        Toast.success('외식비가 삭제되었습니다');
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
        deleteDiningExpense();
      }

      return (
        <DeleteConfirmBottomSheet
          open={isOpen}
          onClose={closeSheet}
          onConfirm={confirmDelete}
          title="외식비를 삭제하시겠습니까?"
          description="삭제된 내역은 복구할 수 없습니다."
        />
      );
    });
  }

  return (
    <AppScreen className="pointer-events-auto" appBar={{ title: '외식비 수정' }}>
      <div className="px-4 pt-4 pb-28">
        <DiningExpenseForm
          formId={formId}
          defaultValues={{
            date: expense.date,
            kind: expense.kind,
            brand: expense.brand,
            name: expense.name ?? '',
            store: expense.store ?? '',
            price: expense.price,
            memo: expense.memo ?? '',
          }}
          brandNames={brandNames}
          storeNames={storeNames}
          onSubmit={handleSubmit}
          onKindChange={setKind}
        />
      </div>
      <CTAConfirmButton>
        <CTAConfirmButton.Left
          type="button"
          color="danger"
          variant="subtle"
          disabled={isPending}
          onClick={openDeleteConfirm}
        >
          삭제
        </CTAConfirmButton.Left>
        <CTAConfirmButton.Right
          type="submit"
          form={formId}
          color="confirm"
          variant="filled"
          disabled={isPending}
        >
          저장
        </CTAConfirmButton.Right>
      </CTAConfirmButton>
    </AppScreen>
  );
}
