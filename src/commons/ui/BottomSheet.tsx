'use client';

import { type ComponentProps, type ReactNode } from 'react';

import { X } from 'lucide-react';

import { cn } from '../lib';

import { Drawer } from './Drawer';

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/
interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

function BottomSheetRoot({ open, onClose, title, children, className }: BottomSheetProps) {
  return (
    <Drawer open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Drawer.Content className={cn(className)}>
        {title && (
          <Drawer.Header>
            <Drawer.Title>{title}</Drawer.Title>
            <Drawer.Close asChild>
              <button className="rounded-full p-1 text-gray-500 transition-colors hover:text-gray-800">
                <X className="size-5" />
              </button>
            </Drawer.Close>
          </Drawer.Header>
        )}
        <div className="overflow-y-auto">{children}</div>
      </Drawer.Content>
    </Drawer>
  );
}
BottomSheetRoot.displayName = 'BottomSheet';

/* -------------------------------------------------------------------------------------------------
 * Header
 * -----------------------------------------------------------------------------------------------*/
function BottomSheetHeader(props: ComponentProps<'div'>) {
  return <Drawer.Header {...props} />;
}
BottomSheetHeader.displayName = 'BottomSheet.Header';

/* -------------------------------------------------------------------------------------------------
 * Footer
 * -----------------------------------------------------------------------------------------------*/
function BottomSheetFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('border-t px-4 py-3', className)} {...props} />;
}
BottomSheetFooter.displayName = 'BottomSheet.Footer';

const BottomSheet = Object.assign(BottomSheetRoot, {
  Header: BottomSheetHeader,
  Footer: BottomSheetFooter,
});

export { BottomSheet };
