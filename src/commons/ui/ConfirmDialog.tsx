'use client';

import { type ReactNode } from 'react';

import { Button } from './Button';
import { Dialog } from './Dialog';

/* -------------------------------------------------------------------------------------------------
 * ConfirmDialog
 * 사용자에게 확인/취소 여부를 묻는 Dialog.
 * 배경(Overlay) 클릭으로는 닫히지 않으며, 반드시 버튼을 통해 닫힌다.
 * -----------------------------------------------------------------------------------------------*/
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  /**
   * 확인 동작이 처리 중임을 나타낸다.
   * 중복 확인을 막고, 되돌릴 수 없는 요청이 이미 떠난 뒤에 취소가 취소처럼 보이지 않도록 두 버튼을 함께 비활성화한다.
   */
  pending?: boolean;
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
  pending = false,
}: ConfirmDialogProps) {
  function cancel() {
    onCancel?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content onPointerDownOutside={(e) => e.preventDefault()}>
        <Dialog.Header heading={title} description={description} />
        <Dialog.Footer>
          <Button
            variant="outline"
            color="mono"
            className="flex-1"
            disabled={pending}
            onClick={cancel}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="default"
            color="primary"
            className="flex-1"
            disabled={pending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

export { ConfirmDialog, type ConfirmDialogProps };
