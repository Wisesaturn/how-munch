'use client';

import * as React from 'react';

import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { Check } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib';

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/

const checkboxVariants = cva(
  [
    'flex shrink-0 items-center justify-center rounded transition-colors outline-none',
    'focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-1',
    'aria-[checked=false]:border-2 aria-[checked=false]:border-gray-300 aria-[checked=false]:bg-white',
    'aria-[checked=true]:border-emerald-500 aria-[checked=true]:bg-emerald-500',
    'disabled:cursor-not-allowed disabled:aria-[checked=false]:border-gray-200 disabled:aria-[checked=false]:bg-gray-100',
    'disabled:aria-[checked=true]:border-gray-300 disabled:aria-[checked=true]:bg-gray-300',
    'data-[invalid=true]:aria-[checked=false]:border-red-400 data-[invalid=true]:aria-[checked=false]:bg-red-50',
    'data-[invalid=true]:aria-[checked=true]:border-red-500 data-[invalid=true]:aria-[checked=true]:bg-red-500',
  ],
  {
    variants: {
      size: {
        xs: 'size-4',
        sm: 'size-5',
      },
    },
    defaultVariants: {
      size: 'xs',
    },
  },
);

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

type CheckboxProps = React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> &
  VariantProps<typeof checkboxVariants> & {
    invalid?: boolean;
  };

const Checkbox = React.forwardRef<React.ComponentRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ size, disabled = false, invalid = false, className, ...props }, ref) => (
    <CheckboxPrimitive.Root
      ref={ref}
      data-slot="checkbox"
      disabled={disabled}
      data-invalid={!disabled && invalid}
      className={cn(checkboxVariants({ size }), className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        <Check className={size === 'sm' ? 'size-3.5' : 'size-3'} strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  ),
);

Checkbox.displayName = 'Checkbox';

/* -------------------------------------------------------------------------------------------------
 * Export
 * -----------------------------------------------------------------------------------------------*/

export { Checkbox, type CheckboxProps };
