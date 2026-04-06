'use client';

import { type ReactNode } from 'react';

import { Button } from './Button';
import { Dialog } from './Dialog';

/* -------------------------------------------------------------------------------------------------
 * AlertDialog
 * 사용자에게 정보를 알려주는 Dialog. 확인 버튼만 제공한다.
 * 배경(Overlay) 클릭으로도 닫힌다 (기본 동작).
 * -----------------------------------------------------------------------------------------------*/
interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void;
}

function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = '확인',
  onConfirm,
}: AlertDialogProps) {
  function confirm() {
    onConfirm?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Header heading={title} description={description} />
        <Dialog.Footer>
          <Button variant="default" color="primary" className="flex-1" onClick={confirm}>
            {confirmLabel}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

export { AlertDialog, type AlertDialogProps };
