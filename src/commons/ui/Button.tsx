import * as React from 'react';

import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib';

const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none hover:cursor-pointer focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: '',
        destructive:
          'bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 text-white',
        outline: 'bg-background border shadow-xs',
        secondary: '',
        ghost: '',
        link: 'underline-offset-4 hover:underline',
      },
      color: {
        mono: '',
        primary: '',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-xs': "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    compoundVariants: [
      { variant: 'default', color: 'mono', className: 'bg-gray-900 text-white hover:bg-gray-800' },
      {
        variant: 'default',
        color: 'primary',
        className: 'bg-emerald-600 text-white hover:bg-emerald-500',
      },
      {
        variant: 'outline',
        color: 'mono',
        className: 'border-gray-300 text-gray-700 hover:bg-gray-50',
      },
      {
        variant: 'outline',
        color: 'primary',
        className: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
      },
      {
        variant: 'secondary',
        color: 'mono',
        className: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
      },
      {
        variant: 'secondary',
        color: 'primary',
        className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
      },
      { variant: 'ghost', color: 'mono', className: 'text-gray-700 hover:bg-gray-100' },
      { variant: 'ghost', color: 'primary', className: 'text-emerald-700 hover:bg-emerald-50' },
      { variant: 'link', color: 'mono', className: 'text-gray-700' },
      { variant: 'link', color: 'primary', className: 'text-emerald-700' },
    ],
    defaultVariants: {
      variant: 'default',
      color: 'mono',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  color = 'mono',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-color={color}
      data-size={size}
      className={cn(buttonVariants({ variant, color, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
