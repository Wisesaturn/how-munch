'use client';

import * as React from 'react';

import { Drawer as DrawerPrimitive } from 'vaul';

import { cn } from '../lib';

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/
function DrawerRoot({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />;
}
DrawerRoot.displayName = 'Drawer';

/* -------------------------------------------------------------------------------------------------
 * Portal
 * -----------------------------------------------------------------------------------------------*/
function DrawerPortal(props: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal {...props} />;
}
DrawerPortal.displayName = 'Drawer.Portal';

/* -------------------------------------------------------------------------------------------------
 * Trigger
 * -----------------------------------------------------------------------------------------------*/
function DrawerTrigger(props: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger {...props} />;
}
DrawerTrigger.displayName = 'Drawer.Trigger';

/* -------------------------------------------------------------------------------------------------
 * Close
 * -----------------------------------------------------------------------------------------------*/
function DrawerClose(props: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close {...props} />;
}
DrawerClose.displayName = 'Drawer.Close';

/* -------------------------------------------------------------------------------------------------
 * Overlay
 * -----------------------------------------------------------------------------------------------*/
const DrawerOverlay = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-[var(--z-drawer-overlay)] bg-black/40', className)}
    {...props}
  />
));
DrawerOverlay.displayName = 'Drawer.Overlay';

/* -------------------------------------------------------------------------------------------------
 * Handle
 * -----------------------------------------------------------------------------------------------*/
const DrawerHandle = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Handle>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Handle>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Handle
    ref={ref}
    className={cn('mx-auto mt-3 h-1.5 w-12 rounded-full bg-gray-200', className)}
    {...props}
  />
));
DrawerHandle.displayName = 'Drawer.Handle';

/* -------------------------------------------------------------------------------------------------
 * Content
 * -----------------------------------------------------------------------------------------------*/
const DrawerContent = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      aria-describedby={undefined}
      {...props}
      className={cn(
        'safe-area-padding-bottom fixed right-0 bottom-0 left-0 z-[var(--z-drawer-content)] mt-24 flex max-h-[85vh] flex-col rounded-t-2xl border bg-white',
        className,
      )}
    >
      {/* Radix Title 접근성 경고 방지 */}
      <DrawerPrimitive.Title aria-hidden className="sr-only" />
      <DrawerHandle />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = 'Drawer.Content';

/* -------------------------------------------------------------------------------------------------
 * Header
 * -----------------------------------------------------------------------------------------------*/
function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex items-center justify-between px-4 py-3', className)} {...props} />
  );
}
DrawerHeader.displayName = 'Drawer.Header';

/* -------------------------------------------------------------------------------------------------
 * Title
 * -----------------------------------------------------------------------------------------------*/
function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return <DrawerPrimitive.Title className={cn('text-base font-semibold', className)} {...props} />;
}
DrawerTitle.displayName = 'Drawer.Title';

/* -------------------------------------------------------------------------------------------------
 * Description
 * -----------------------------------------------------------------------------------------------*/
function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description className={cn('text-sm text-gray-500', className)} {...props} />
  );
}
DrawerDescription.displayName = 'Drawer.Description';

const Drawer = Object.assign(DrawerRoot, {
  Portal: DrawerPortal,
  Trigger: DrawerTrigger,
  Close: DrawerClose,
  Overlay: DrawerOverlay,
  Handle: DrawerHandle,
  Content: DrawerContent,
  Header: DrawerHeader,
  Title: DrawerTitle,
  Description: DrawerDescription,
});

export { Drawer };
