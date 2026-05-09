'use client';

import { Children, isValidElement, type ComponentProps, type ReactNode } from 'react';

import { useControlledState } from 'react-simplikit';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib';
import { createSafeContext } from '../lib/context';

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

interface SegmentControlContextValue {
  value: string;
  onValueChange: (value: string) => void;
  disabled: boolean;
  size: 'sm' | 'md' | 'lg';
}

const [SegmentControlProvider, useSegmentControl] =
  createSafeContext<SegmentControlContextValue>('SegmentControl');

/* -------------------------------------------------------------------------------------------------
 * Indicator (internal)
 * -----------------------------------------------------------------------------------------------*/

const SIZE_INSET = { sm: 2, md: 2, lg: 4 } as const;

function resolveIndicatorStyle(
  selectedIndex: number,
  totalItems: number,
  inset: number,
): React.CSSProperties | undefined {
  if (selectedIndex < 0 || totalItems === 0) return undefined;
  const occupied = (totalItems + 1) * inset;
  const itemWidth = `(100% - ${occupied}px) / ${totalItems}`;
  return {
    width: `calc(${itemWidth})`,
    left:
      selectedIndex === 0
        ? `${inset}px`
        : `calc(${inset}px + ${selectedIndex} * (${itemWidth} + ${inset}px))`,
  };
}

function SegmentControlIndicator({
  style,
  size,
}: {
  style: React.CSSProperties | undefined;
  size: 'sm' | 'md' | 'lg';
}) {
  if (!style) return null;
  return (
    <span
      aria-hidden
      data-slot="segment-control-indicator"
      className={cn(
        'absolute rounded-md bg-emerald-50 shadow transition-all duration-200 ease-out',
        size === 'lg' ? 'inset-y-1' : 'inset-y-0.5',
      )}
      style={style}
    />
  );
}

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

const segmentControlVariants = cva(
  'relative flex w-full items-center rounded-lg bg-gray-100 select-none',
  {
    variants: {
      size: {
        sm: 'h-8 gap-0.5 p-0.5',
        md: 'h-10 gap-0.5 p-0.5',
        lg: 'h-12 gap-1 p-1',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

interface SegmentControlRootProps
  extends Omit<ComponentProps<'div'>, 'onChange'>, VariantProps<typeof segmentControlVariants> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}

function SegmentControlRoot({
  value: valueProp,
  defaultValue = '',
  onValueChange,
  disabled = false,
  size = 'md',
  className,
  children,
  ...props
}: SegmentControlRootProps) {
  const [value, setValue] = useControlledState({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });

  const resolvedSize = size ?? 'md';

  const itemValues: string[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child)) {
      const childValue = (child.props as { value?: string }).value;
      if (typeof childValue === 'string') itemValues.push(childValue);
    }
  });

  const indicatorStyle = resolveIndicatorStyle(
    itemValues.indexOf(value),
    itemValues.length,
    SIZE_INSET[resolvedSize],
  );

  return (
    <SegmentControlProvider
      value={value}
      onValueChange={setValue}
      disabled={disabled}
      size={resolvedSize}
    >
      <div
        data-slot="segment-control"
        role="group"
        aria-disabled={disabled}
        className={cn(segmentControlVariants({ size }), className)}
        {...props}
      >
        <SegmentControlIndicator style={indicatorStyle} size={resolvedSize} />
        {children}
      </div>
    </SegmentControlProvider>
  );
}

SegmentControlRoot.displayName = 'SegmentControl';

/* -------------------------------------------------------------------------------------------------
 * Item
 * -----------------------------------------------------------------------------------------------*/

const segmentControlItemVariants = cva(
  'relative z-10 flex flex-1 cursor-pointer items-center justify-center rounded-md font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40',
  {
    variants: {
      size: {
        sm: 'px-2 text-xs',
        md: 'px-3 text-sm',
        lg: 'px-4 text-base',
      },
      selected: {
        true: 'font-semibold text-emerald-700',
        false: 'text-gray-500 hover:text-gray-700',
      },
    },
    defaultVariants: { size: 'md', selected: false },
  },
);

interface SegmentControlItemProps extends Omit<ComponentProps<'button'>, 'onChange'> {
  value: string;
  children: ReactNode;
}

function SegmentControlItem({
  value,
  disabled: itemDisabled,
  className,
  children,
  ...props
}: SegmentControlItemProps) {
  const { value: selectedValue, onValueChange, disabled: rootDisabled, size } = useSegmentControl();
  const selected = value === selectedValue;
  const disabled = rootDisabled || itemDisabled;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-slot="segment-control-item"
      data-selected={selected}
      disabled={disabled}
      onClick={() => !selected && onValueChange(value)}
      className={cn(segmentControlItemVariants({ size: size ?? 'md', selected }), className)}
      {...props}
    >
      {children}
    </button>
  );
}

SegmentControlItem.displayName = 'SegmentControl.Item';

/* -------------------------------------------------------------------------------------------------
 * Export
 * -----------------------------------------------------------------------------------------------*/

const SegmentControl = Object.assign(SegmentControlRoot, {
  Root: SegmentControlRoot,
  Item: SegmentControlItem,
});

export { SegmentControl };
