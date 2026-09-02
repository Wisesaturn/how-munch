'use client';

import { type PropsWithChildren, type ComponentProps, type ReactNode } from 'react';

import { cn } from '../lib';

import { Drawer } from './Drawer';

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/
interface BottomSheetRootProps {
  open: boolean;
  onClose: () => void;
  handleOnly?: boolean;
  children: ReactNode;
}

function BottomSheetRoot({ open, onClose, handleOnly = true, children }: BottomSheetRootProps) {
  return (
    <Drawer
      direction="bottom"
      open={open}
      handleOnly={handleOnly}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
    >
      <Drawer.Content data-slot="bottom-sheet-content-root">{children}</Drawer.Content>
    </Drawer>
  );
}
BottomSheetRoot.displayName = 'BottomSheet.Root';

/* -------------------------------------------------------------------------------------------------
 * Header
 * -----------------------------------------------------------------------------------------------*/
interface BottomSheetHeaderProps extends ComponentProps<'div'> {
  heading?: ReactNode;
}

function BottomSheetHeader({ heading, className, children, ...props }: BottomSheetHeaderProps) {
  return (
    <Drawer.Header
      data-slot="bottom-sheet-header"
      className={cn('justify-center border-b', className)}
      {...props}
    >
      {heading ? <Drawer.Title className="w-full text-center">{heading}</Drawer.Title> : children}
    </Drawer.Header>
  );
}
BottomSheetHeader.displayName = 'BottomSheet.Header';

/* -------------------------------------------------------------------------------------------------
 * Content
 * -----------------------------------------------------------------------------------------------*/
interface BottomSheetContentProps extends PropsWithChildren<ComponentProps<'div'>> {
  className?: string;
}

function BottomSheetContent({ className, children, ...props }: BottomSheetContentProps) {
  return (
    <div
      data-slot="bottom-sheet-content"
      className={cn('overflow-y-auto p-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}
BottomSheetContent.displayName = 'BottomSheet.Content';

/* -------------------------------------------------------------------------------------------------
 * Footer
 * -----------------------------------------------------------------------------------------------*/
type BottomSheetFooterProps = PropsWithChildren<ComponentProps<'div'>>;

function BottomSheetFooter({ className, children, ...props }: BottomSheetFooterProps) {
  return (
    <div
      data-slot="bottom-sheet-footer"
      className={cn('flex shrink-0 flex-col gap-2 px-4 pt-2 pb-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}
BottomSheetFooter.displayName = 'BottomSheet.Footer';

const BottomSheet = Object.assign(BottomSheetRoot, {
  Root: BottomSheetRoot,
  Header: BottomSheetHeader,
  Content: BottomSheetContent,
  Footer: BottomSheetFooter,
});

BottomSheet.displayName = 'BottomSheet';

export { BottomSheet };
