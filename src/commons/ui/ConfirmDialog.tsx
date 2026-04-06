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
          <Button variant="outline" color="mono" className="flex-1" onClick={cancel}>
            {cancelLabel}
          </Button>
          <Button variant="default" color="primary" className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

export { ConfirmDialog, type ConfirmDialogProps };
