'use client';

import { type ComponentProps, type ReactNode } from 'react';

import { X } from 'lucide-react';

import { cn, createSafeContext } from '../lib';

import { Drawer } from './Drawer';

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/
interface BottomSheetContextValue {
  onClose: () => void;
}

const [BottomSheetProvider, useBottomSheetContext] =
  createSafeContext<BottomSheetContextValue>('BottomSheet');

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/
interface BottomSheetRootProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

function BottomSheetRoot({ open, onClose, children }: BottomSheetRootProps) {
  return (
    <Drawer open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <BottomSheetProvider onClose={onClose}>{children}</BottomSheetProvider>
    </Drawer>
  );
}
BottomSheetRoot.displayName = 'BottomSheet.Root';

/* -------------------------------------------------------------------------------------------------
 * Header
 * -----------------------------------------------------------------------------------------------*/
interface BottomSheetHeaderProps extends ComponentProps<'div'> {
  heading?: ReactNode;
  withCloseButton?: boolean;
}

function BottomSheetHeader({
  heading,
  withCloseButton = true,
  className,
  children,
  ...props
}: BottomSheetHeaderProps) {
  const { onClose } = useBottomSheetContext('BottomSheet.Header');

  return (
    <Drawer.Header className={cn(className)} {...props}>
      {heading ? <Drawer.Title>{heading}</Drawer.Title> : children}
      {withCloseButton && (
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-gray-500 transition-colors hover:text-gray-800"
        >
          <X className="size-5" />
        </button>
      )}
    </Drawer.Header>
  );
}
BottomSheetHeader.displayName = 'BottomSheet.Header';

/* -------------------------------------------------------------------------------------------------
 * Content
 * -----------------------------------------------------------------------------------------------*/
interface BottomSheetContentProps extends ComponentProps<'div'> {
  contentClassName?: string;
}

function BottomSheetContent({ className, contentClassName, ...props }: BottomSheetContentProps) {
  return (
    <Drawer.Content className={cn(className)}>
      <div className={cn('overflow-y-auto p-4', contentClassName)} {...props} />
    </Drawer.Content>
  );
}
BottomSheetContent.displayName = 'BottomSheet.Content';

const BottomSheet = Object.assign(BottomSheetRoot, {
  Root: BottomSheetRoot,
  Header: BottomSheetHeader,
  Content: BottomSheetContent,
});

BottomSheet.displayName = 'BottomSheet';

export { BottomSheet };
