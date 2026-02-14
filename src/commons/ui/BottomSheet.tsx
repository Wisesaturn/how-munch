'use client';

import { type ReactNode } from 'react';

import { X } from 'lucide-react';

import { cn } from '../lib';

import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from './Drawer';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  return (
    <Drawer open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DrawerContent className={cn(className)}>
        {title && (
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerClose asChild>
              <button className="rounded-full p-1 text-gray-500 transition-colors hover:text-gray-800">
                <X className="size-5" />
              </button>
            </DrawerClose>
          </DrawerHeader>
        )}
        <div className="overflow-y-auto">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
