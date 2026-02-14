'use client';

import * as React from 'react';

import { X } from 'lucide-react';

import { cn } from '../lib';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

interface ModalPartProps extends React.ComponentProps<'div'> {
  onClose?: () => void;
}

/* -------------------------------------------------------------------------------------------------
 * Overlay
 * -----------------------------------------------------------------------------------------------*/
function ModalOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div data-slot="modal-overlay-bg" className="absolute inset-0 bg-black/40" onClick={onClose} />
  );
}
ModalOverlay.displayName = 'Modal.Overlay';

/* -------------------------------------------------------------------------------------------------
 * Content
 * -----------------------------------------------------------------------------------------------*/
function ModalContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="modal"
      className={cn(
        'pb-safe-area-inset-bottom relative z-10 w-full max-w-[430px] rounded-t-2xl bg-white',
        className,
      )}
      {...props}
    />
  );
}
ModalContent.displayName = 'Modal.Content';

/* -------------------------------------------------------------------------------------------------
 * Header
 * -----------------------------------------------------------------------------------------------*/
function ModalHeader({ className, ...props }: ModalPartProps) {
  return (
    <div
      className={cn('flex items-center justify-between border-b px-4 py-3', className)}
      {...props}
    />
  );
}
ModalHeader.displayName = 'Modal.Header';

/* -------------------------------------------------------------------------------------------------
 * Body
 * -----------------------------------------------------------------------------------------------*/
function ModalBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('max-h-[70vh] overflow-y-auto', className)} {...props} />;
}
ModalBody.displayName = 'Modal.Body';

/* -------------------------------------------------------------------------------------------------
 * Footer
 * -----------------------------------------------------------------------------------------------*/
function ModalFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('border-t px-4 py-3', className)} {...props} />;
}
ModalFooter.displayName = 'Modal.Footer';

/* -------------------------------------------------------------------------------------------------
 * Title
 * -----------------------------------------------------------------------------------------------*/
function ModalTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return <h2 className={cn('text-base font-semibold', className)} {...props} />;
}
ModalTitle.displayName = 'Modal.Title';

/* -------------------------------------------------------------------------------------------------
 * CloseButton
 * -----------------------------------------------------------------------------------------------*/
function ModalCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="text-muted-foreground hover:text-foreground rounded-full p-1 transition-colors"
    >
      <X className="size-5" />
    </button>
  );
}
ModalCloseButton.displayName = 'Modal.CloseButton';

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/
function ModalRoot({ open, onClose, title, children, className }: ModalProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div data-slot="modal-overlay" className="fixed inset-0 z-50 flex items-end justify-center">
      <ModalOverlay onClose={onClose} />
      <ModalContent className={className}>
        {title && (
          <ModalHeader>
            <ModalTitle>{title}</ModalTitle>
            <ModalCloseButton onClose={onClose} />
          </ModalHeader>
        )}
        <ModalBody>{children}</ModalBody>
      </ModalContent>
    </div>
  );
}
ModalRoot.displayName = 'Modal';

const Modal = Object.assign(ModalRoot, {
  Overlay: ModalOverlay,
  Content: ModalContent,
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter,
  Title: ModalTitle,
  CloseButton: ModalCloseButton,
});

export { Modal };
