'use client';

import * as React from 'react';

import { Command as CommandPrimitive } from 'cmdk';

import { cn } from '../lib';

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/
const CommandRoot = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, forwardedRef) => {
  return (
    <CommandPrimitive
      ref={forwardedRef}
      className={cn('flex h-full w-full flex-col overflow-hidden rounded-md', className)}
      {...props}
    />
  );
});

CommandRoot.displayName = 'CommandRoot';

/* -------------------------------------------------------------------------------------------------
 * Input
 * -----------------------------------------------------------------------------------------------*/
interface CommandInputProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> {
  invalid?: boolean;
}

const CommandInput = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Input>,
  CommandInputProps
>(({ className, invalid = false, 'aria-invalid': ariaInvalid, ...props }, forwardedRef) => {
  const isInvalid = Boolean(invalid || ariaInvalid);

  return (
    <CommandPrimitive.Input
      ref={forwardedRef}
      aria-invalid={isInvalid}
      data-invalid={isInvalid}
      className={cn(
        'text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/50 focus-visible:border-ring focus-visible:ring-ring/50 flex h-10 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus:ring-[3px] focus-visible:ring-[3px]',
        'disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:placeholder:text-gray-400',
        'data-[invalid=true]:border-red-500 data-[invalid=true]:focus:border-red-600 data-[invalid=true]:focus:ring-red-200 data-[invalid=true]:focus-visible:border-red-600 data-[invalid=true]:focus-visible:ring-red-200',
        className,
      )}
      {...props}
    />
  );
});

CommandInput.displayName = 'CommandInput';

/* -------------------------------------------------------------------------------------------------
 * List
 * -----------------------------------------------------------------------------------------------*/
const CommandList = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, forwardedRef) => {
  return (
    <CommandPrimitive.List
      ref={forwardedRef}
      className={cn('max-h-56 overflow-x-hidden overflow-y-auto', className)}
      {...props}
    />
  );
});

CommandList.displayName = 'CommandList';

/* -------------------------------------------------------------------------------------------------
 * Empty
 * -----------------------------------------------------------------------------------------------*/
const CommandEmpty = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>(({ className, ...props }, forwardedRef) => {
  return (
    <CommandPrimitive.Empty
      ref={forwardedRef}
      className={cn('px-2 py-1.5 text-sm text-gray-500', className)}
      {...props}
    />
  );
});

CommandEmpty.displayName = 'CommandEmpty';

/* -------------------------------------------------------------------------------------------------
 * Item
 * -----------------------------------------------------------------------------------------------*/
const CommandItem = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, forwardedRef) => {
  return (
    <CommandPrimitive.Item
      ref={forwardedRef}
      className={cn(
        'relative cursor-default rounded-sm px-2 py-1.5 text-sm outline-none data-[selected=true]:bg-emerald-50 data-[selected=true]:font-semibold data-[selected=true]:text-emerald-900',
        className,
      )}
      {...props}
    />
  );
});

CommandItem.displayName = 'CommandItem';

/* -------------------------------------------------------------------------------------------------
 * Compound Export
 * -----------------------------------------------------------------------------------------------*/
const Command = Object.assign(CommandRoot, {
  Input: CommandInput,
  List: CommandList,
  Empty: CommandEmpty,
  Item: CommandItem,
});

export { Command };
