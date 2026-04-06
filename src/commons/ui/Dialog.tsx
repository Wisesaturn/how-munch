'use client';

import * as React from 'react';

import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';

import { cn } from '../lib';

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/
const DialogRoot = DialogPrimitive.Root;
DialogRoot.displayName = 'Dialog';

/* -------------------------------------------------------------------------------------------------
 * Trigger
 * -----------------------------------------------------------------------------------------------*/
const DialogTrigger = DialogPrimitive.Trigger;
DialogTrigger.displayName = 'Dialog.Trigger';

/* -------------------------------------------------------------------------------------------------
 * Portal
 * -----------------------------------------------------------------------------------------------*/
const DialogPortal = DialogPrimitive.Portal;

/* -------------------------------------------------------------------------------------------------
 * Overlay
 * -----------------------------------------------------------------------------------------------*/
const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-[var(--z-dialog-overlay)] bg-black/50',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = 'Dialog.Overlay';

/* -------------------------------------------------------------------------------------------------
 * Content
 * -----------------------------------------------------------------------------------------------*/
const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed top-1/2 left-1/2 z-[var(--z-dialog-content)] w-full max-w-md -translate-x-1/2 -translate-y-1/2',
        'flex max-h-[85vh] flex-col rounded-2xl bg-white shadow-lg outline-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[state=closed]:slide-out-to-top-1/2 data-[state=open]:slide-in-from-top-1/2',
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = 'Dialog.Content';

/* -------------------------------------------------------------------------------------------------
 * Header
 * -----------------------------------------------------------------------------------------------*/
interface DialogHeaderProps extends React.ComponentProps<'div'> {
  heading?: React.ReactNode;
  description?: React.ReactNode;
}

function DialogHeader({ heading, description, className, children, ...props }: DialogHeaderProps) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex shrink-0 flex-col gap-1 border-b px-4 py-4', className)}
      {...props}
    >
      {heading ? (
        <DialogPrimitive.Title className="text-base font-semibold text-gray-900">
          {heading}
        </DialogPrimitive.Title>
      ) : null}
      {description ? (
        <DialogPrimitive.Description className="text-sm text-gray-500">
          {description}
        </DialogPrimitive.Description>
      ) : null}
      {children}
    </div>
  );
}
DialogHeader.displayName = 'Dialog.Header';

/* -------------------------------------------------------------------------------------------------
 * Body
 * -----------------------------------------------------------------------------------------------*/
function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-body"
      className={cn('flex-1 overflow-y-auto px-4 py-4', className)}
      {...props}
    />
  );
}
DialogBody.displayName = 'Dialog.Body';

/* -------------------------------------------------------------------------------------------------
 * Footer
 * -----------------------------------------------------------------------------------------------*/
function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex shrink-0 flex-row gap-2 border-t px-4 py-4', className)}
      {...props}
    />
  );
}
DialogFooter.displayName = 'Dialog.Footer';

/* -------------------------------------------------------------------------------------------------
 * Close
 * -----------------------------------------------------------------------------------------------*/
const DialogClose = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Close
    ref={ref}
    className={cn(
      'absolute top-4 right-4 rounded-sm p-0.5 text-gray-500 transition-colors',
      'hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:outline-none',
      'disabled:pointer-events-none',
      className,
    )}
    {...props}
  >
    {children ?? <X className="size-4" aria-hidden="true" />}
    <span className="sr-only">닫기</span>
  </DialogPrimitive.Close>
));
DialogClose.displayName = 'Dialog.Close';

/* -------------------------------------------------------------------------------------------------
 * Title (standalone)
 * -----------------------------------------------------------------------------------------------*/
const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-base font-semibold text-gray-900', className)}
    {...props}
  />
));
DialogTitle.displayName = 'Dialog.Title';

/* -------------------------------------------------------------------------------------------------
 * Description (standalone)
 * -----------------------------------------------------------------------------------------------*/
const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-gray-500', className)}
    {...props}
  />
));
DialogDescription.displayName = 'Dialog.Description';

/* -------------------------------------------------------------------------------------------------
 * Compound Export
 * -----------------------------------------------------------------------------------------------*/
const Dialog = Object.assign(DialogRoot, {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Content: DialogContent,
  Header: DialogHeader,
  Body: DialogBody,
  Footer: DialogFooter,
  Close: DialogClose,
  Title: DialogTitle,
  Description: DialogDescription,
});

Dialog.displayName = 'Dialog';

export { Dialog };
