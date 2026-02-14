'use client';

import * as React from 'react';

import { Drawer as DrawerPrimitive } from 'vaul';

import { cn } from '../lib';

function Drawer({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />;
}

function DrawerPortal(props: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal {...props} />;
}

function DrawerTrigger(props: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger {...props} />;
}

function DrawerClose(props: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close {...props} />;
}

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/40', className)}
    {...props}
  />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        'pb-safe-area-inset-bottom fixed right-0 bottom-0 left-0 z-50 mt-24 flex max-h-[85vh] flex-col rounded-t-2xl border bg-white',
        className,
      )}
      {...props}
    >
      <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-gray-200" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = DrawerPrimitive.Content.displayName;

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex items-center justify-between border-b px-4 py-3', className)}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return <DrawerPrimitive.Title className={cn('text-base font-semibold', className)} {...props} />;
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description className={cn('text-sm text-gray-500', className)} {...props} />
  );
}

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};
