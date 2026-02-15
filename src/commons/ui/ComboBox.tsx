'use client';

import * as React from 'react';

import { useControlledState } from 'react-simplikit';

import { createSafeContext } from '../lib/context';

import { Command } from './Command';
import { Popover } from './Popover';

interface ComboBoxContextValue {
  value?: string;
  updateValue: (value: string) => void;
  open: boolean;
  openPopover: () => void;
  closePopover: () => void;
}

interface ComboBoxProps extends Omit<
  React.ComponentPropsWithoutRef<typeof Command>,
  'value' | 'defaultValue' | 'onValueChange'
> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

const [ComboBoxProvider, useComboBoxContext] = createSafeContext<ComboBoxContextValue>('ComboBox');

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/
const ComboBoxRoot = React.forwardRef<React.ComponentRef<typeof Command>, ComboBoxProps>(
  (
    { value: valueProp, defaultValue = '', onValueChange, children, ...commandProps },
    forwardedRef,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [value, updateValue] = useControlledState<string>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    });

    function openPopover() {
      setOpen(true);
    }

    function closePopover() {
      setOpen(false);
    }

    return (
      <Popover open={open}>
        <ComboBoxProvider
          value={value}
          updateValue={updateValue}
          open={open}
          openPopover={openPopover}
          closePopover={closePopover}
        >
          <Command ref={forwardedRef} shouldFilter {...commandProps}>
            {children}
          </Command>
        </ComboBoxProvider>
      </Popover>
    );
  },
);

ComboBoxRoot.displayName = 'ComboBoxRoot';

/* -------------------------------------------------------------------------------------------------
 * Input
 * -----------------------------------------------------------------------------------------------*/
const ComboBoxInput = React.forwardRef<
  React.ComponentRef<typeof Command.Input>,
  Omit<React.ComponentPropsWithoutRef<typeof Command.Input>, 'value' | 'onValueChange'>
>(({ onFocus, onBlur, onKeyDown, ...props }, forwardedRef) => {
  const { value, updateValue, openPopover, closePopover } = useComboBoxContext();

  function handleBlur(event: React.FocusEvent<HTMLInputElement>) {
    onBlur?.(event);
    window.setTimeout(closePopover, 120);
  }

  function handleFocus(event: React.FocusEvent<HTMLInputElement>) {
    onFocus?.(event);
    openPopover();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);

    if (event.key === 'Home') {
      event.preventDefault();
      event.currentTarget.setSelectionRange(0, 0);
    }

    if (event.key === 'End') {
      event.preventDefault();
      const endIndex = event.currentTarget.value.length;
      event.currentTarget.setSelectionRange(endIndex, endIndex);
    }
  }

  return (
    <Popover.Anchor asChild>
      <Command.Input
        ref={forwardedRef}
        value={value}
        onValueChange={(nextValue) => {
          updateValue(nextValue);
          openPopover();
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        {...props}
      />
    </Popover.Anchor>
  );
});

ComboBoxInput.displayName = 'ComboBoxInput';

/* -------------------------------------------------------------------------------------------------
 * List
 * -----------------------------------------------------------------------------------------------*/
const ComboBoxList = React.forwardRef<
  React.ComponentRef<typeof Command.List>,
  React.ComponentPropsWithoutRef<typeof Command.List> &
    Pick<React.ComponentPropsWithoutRef<typeof Popover.Content>, 'container'>
>(({ container, ...props }, forwardedRef) => {
  const { closePopover } = useComboBoxContext();

  return (
    <Popover.Content
      align="start"
      sideOffset={4}
      container={container}
      onOpenAutoFocus={(event) => event.preventDefault()}
      onEscapeKeyDown={() => closePopover()}
      className="bg-popover text-popover-foreground border-input z-(--z-popover) w-[var(--radix-popover-trigger-width)] rounded-md border p-1 shadow-md"
    >
      <Command.List ref={forwardedRef} {...props} />
    </Popover.Content>
  );
});

ComboBoxList.displayName = 'ComboBoxList';

/* -------------------------------------------------------------------------------------------------
 * Item
 * -----------------------------------------------------------------------------------------------*/
const ComboBoxItem = React.forwardRef<
  React.ComponentRef<typeof Command.Item>,
  React.ComponentPropsWithoutRef<typeof Command.Item>
>(({ onSelect, ...props }, forwardedRef) => {
  const { updateValue, closePopover } = useComboBoxContext();

  function selectItem(nextValue: string) {
    updateValue(nextValue);
    closePopover();
    onSelect?.(nextValue);
  }

  return <Command.Item ref={forwardedRef} onSelect={selectItem} {...props} />;
});

ComboBoxItem.displayName = 'ComboBoxItem';

/* -------------------------------------------------------------------------------------------------
 * Empty
 * -----------------------------------------------------------------------------------------------*/
const ComboBoxEmpty = Command.Empty;

/* -------------------------------------------------------------------------------------------------
 * Compound Export
 * -----------------------------------------------------------------------------------------------*/
const ComboBox = Object.assign(ComboBoxRoot, {
  Input: ComboBoxInput,
  List: ComboBoxList,
  Item: ComboBoxItem,
  Empty: ComboBoxEmpty,
});

export { ComboBox, type ComboBoxProps };
