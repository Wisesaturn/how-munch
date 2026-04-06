'use client';

import { type ReactNode } from 'react';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

/* -------------------------------------------------------------------------------------------------
 * DeleteConfirmBottomSheet
 * 삭제 전 사용자 확인을 요청하는 BottomSheet.
 * overlay-kit과 함께 사용하거나 controlled 방식으로도 사용할 수 있다.
 * -----------------------------------------------------------------------------------------------*/
interface DeleteConfirmBottomSheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
}

/**
 * @description 삭제 액션 전 사용자 확인을 요청하는 BottomSheet 컴포넌트.
 * overlay-kit의 overlay.open() 패턴과 함께 사용하거나 controlled 방식으로도 사용할 수 있다.
 */
function DeleteConfirmBottomSheet({
  open,
  onClose,
  onConfirm,
  title = '정말 삭제하시겠습니까?',
  description,
  confirmLabel = '삭제',
  cancelLabel = '취소',
  isPending = false,
}: DeleteConfirmBottomSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} handleOnly={false}>
      <BottomSheet.Header heading={title} />
      <BottomSheet.Content className="space-y-2">
        {description ? (
          <p className="text-muted-foreground text-center text-sm">{description}</p>
        ) : null}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            color="mono"
            className="flex-1"
            onClick={onClose}
            disabled={isPending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            onClick={onConfirm}
            disabled={isPending}
          >
            {confirmLabel}
          </Button>
        </div>
      </BottomSheet.Content>
    </BottomSheet>
  );
}

export { DeleteConfirmBottomSheet, type DeleteConfirmBottomSheetProps };
