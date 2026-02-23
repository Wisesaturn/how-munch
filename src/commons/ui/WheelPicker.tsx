'use client';

import * as React from 'react';

import {
  WheelPicker as WheelPickerPrimitive,
  WheelPickerWrapper as WheelPickerWrapperPrimitive,
  type WheelPickerClassNames,
  type WheelPickerOption,
  type WheelPickerProps as WheelPickerPrimitiveProps,
  type WheelPickerValue,
} from '@ncdai/react-wheel-picker';

import { cn, createSafeContext } from '../lib';

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/
interface WheelPickerContextValue {
  disabled: boolean;
  invalid: boolean;
}

const [WheelPickerProvider, useWheelPickerContext] = createSafeContext<WheelPickerContextValue>(
  'WheelPicker',
  {
    disabled: false,
    invalid: false,
  },
);

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/
interface WheelPickerRootProps extends React.ComponentProps<'div'> {
  disabled?: boolean;
  invalid?: boolean;
}

function WheelPickerRoot({
  className,
  children,
  disabled = false,
  invalid = false,
  ...props
}: WheelPickerRootProps) {
  return (
    <WheelPickerProvider disabled={disabled} invalid={invalid}>
      <WheelPickerWrapperPrimitive
        data-slot="wheel-picker-root"
        data-disabled={disabled}
        data-invalid={invalid}
        aria-disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn('w-full', disabled && 'cursor-not-allowed opacity-60', className)}
        {...props}
      >
        {children}
      </WheelPickerWrapperPrimitive>
    </WheelPickerProvider>
  );
}

WheelPickerRoot.displayName = 'WheelPicker.Root';

/* -------------------------------------------------------------------------------------------------
 * Item
 * -----------------------------------------------------------------------------------------------*/
type WheelPickerItemProps<T extends WheelPickerValue = string> = WheelPickerPrimitiveProps<T> & {
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  classNames?: WheelPickerClassNames;
};

function WheelPickerItem<T extends WheelPickerValue = string>({
  className,
  classNames,
  value,
  defaultValue,
  options,
  onValueChange,
  infinite = false,
  visibleCount = 20,
  dragSensitivity = 2,
  scrollSensitivity = 7,
  optionItemHeight = 40,
  disabled,
  invalid,
}: WheelPickerItemProps<T>) {
  const context = useWheelPickerContext('WheelPicker.Item');
  const isDisabled = Boolean(disabled ?? context.disabled);
  const isInvalid = Boolean(invalid ?? context.invalid);

  function changeSelectedValue(nextValue: T) {
    if (isDisabled) return;
    onValueChange?.(nextValue);
  }

  return (
    <div
      data-slot="wheel-picker-item"
      data-disabled={isDisabled}
      data-invalid={isInvalid}
      aria-disabled={isDisabled}
      aria-invalid={isInvalid || undefined}
      className={cn(
        'min-w-0 flex-1',
        // disabled 상태에서는 휠 내부 drag/scroll/keyboard 상호작용을 막습니다.
        isDisabled && 'pointer-events-none',
        className,
      )}
    >
      <WheelPickerPrimitive
        value={value}
        defaultValue={defaultValue}
        onValueChange={changeSelectedValue}
        options={options}
        infinite={infinite}
        visibleCount={visibleCount}
        dragSensitivity={dragSensitivity}
        scrollSensitivity={scrollSensitivity}
        optionItemHeight={optionItemHeight}
        classNames={{
          optionItem: cn(
            'text-center text-sm font-medium whitespace-nowrap text-gray-500',
            classNames?.optionItem,
          ),
          highlightWrapper: cn(
            'rounded-lg border border-gray-200/90 bg-white/95 shadow-sm backdrop-blur-sm',
            isInvalid && 'border-red-500',
            classNames?.highlightWrapper,
          ),
          highlightItem: cn(
            'text-center text-base font-semibold whitespace-nowrap text-gray-900',
            classNames?.highlightItem,
          ),
        }}
      />
    </div>
  );
}

WheelPickerItem.displayName = 'WheelPicker.Item';

/* -------------------------------------------------------------------------------------------------
 * Compound Export
 * -----------------------------------------------------------------------------------------------*/
const WheelPicker = Object.assign(WheelPickerRoot, {
  Root: WheelPickerRoot,
  Item: WheelPickerItem,
});

WheelPicker.displayName = 'WheelPicker';

export {
  WheelPicker,
  type WheelPickerClassNames,
  type WheelPickerItemProps,
  type WheelPickerOption,
  type WheelPickerRootProps,
  type WheelPickerValue,
};
