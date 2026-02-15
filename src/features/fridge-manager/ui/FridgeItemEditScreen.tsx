'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';

import { ScrollArea, Toast } from '@/commons/ui';

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

  function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return '재료 수정 중 오류가 발생했습니다';
  }

  function handleSubmit(values: FridgeItemFormValues) {
    mutation.mutate(
      {
        id: item.id,
        name: values.name,
        category: values.category,
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

  function deleteItem(id: string) {
    if (!window.confirm(`'${item.name}' 전체를 삭제하시겠습니까?`)) return;

    deleteMutation.mutate(id, {
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
      <ScrollArea className="h-full">
        <div className="p-4">
          <FridgeItemForm
            id={item.id}
            defaultValues={{
              name: item.name,
              category: item.category,
              unit: item.unit,
              is_subdivided: item.is_subdivided,
            }}
            onSubmit={handleSubmit}
            onDelete={deleteItem}
            isPending={mutation.isPending}
            isDeleting={deleteMutation.isPending}
          />
        </div>
      </ScrollArea>
    </AppScreen>
  );
}
