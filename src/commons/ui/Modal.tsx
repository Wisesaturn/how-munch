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

function Modal({ open, onClose, title, children, className }: ModalProps) {
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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        data-slot="modal"
        className={cn(
          'pb-safe-area-inset-bottom relative z-10 w-full max-w-[430px] rounded-t-2xl bg-white',
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-base font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground rounded-full p-1 transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export { Modal };
