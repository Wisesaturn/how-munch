import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib';

import { Button } from './Button';
import { Input, type InputProps } from './Input';

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
const inputGroupAddonVariants = cva('text-muted-foreground flex items-center', {
  variants: {
    align: {
      'inline-start': 'order-first border-r px-1',
      'inline-end': 'order-last border-l px-1',
      'block-start': 'order-first w-full border-b px-2 py-1',
      'block-end': 'order-last w-full border-t px-2 py-1',
    },
  },
  defaultVariants: {
    align: 'inline-start',
  },
});

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/
function InputGroupRoot({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        'border-input bg-background text-foreground flex w-full min-w-0 flex-wrap items-center overflow-hidden rounded-md border shadow-xs transition-[color,box-shadow]',
        'has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot=input-group-control]:focus-visible]:ring-[3px]',
        'has-[[data-slot=input-group-control][data-invalid=true]]:border-red-500 has-[[data-slot=input-group-control][data-invalid=true]]:has-[[data-slot=input-group-control]:focus-visible]:border-red-600 has-[[data-slot=input-group-control][data-invalid=true]]:has-[[data-slot=input-group-control]:focus-visible]:ring-red-200',
        'has-[[data-slot=input-group-control]:disabled]:cursor-not-allowed has-[[data-slot=input-group-control]:disabled]:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------------------------------
 * Control
 * -----------------------------------------------------------------------------------------------*/
function InputGroupInput({ className, ...props }: InputProps) {
  return (
    <Input
      data-slot="input-group-control"
      data-wrapped-within-input-group
      className={cn('h-9 min-w-0 flex-1', className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------------------------------
 * Addon
 * -----------------------------------------------------------------------------------------------*/
interface InputGroupAddonProps
  extends React.ComponentProps<'div'>, VariantProps<typeof inputGroupAddonVariants> {}

function InputGroupAddon({ align = 'inline-start', className, ...props }: InputGroupAddonProps) {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------------------------------
 * Button
 * -----------------------------------------------------------------------------------------------*/
type InputGroupButtonProps = React.ComponentProps<'button'> & {
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
  color?: React.ComponentProps<typeof Button>['color'];
};

function InputGroupButton({
  variant = 'ghost',
  size = 'icon-xs',
  color = 'mono',
  className,
  ...props
}: InputGroupButtonProps) {
  return <Button variant={variant} size={size} color={color} className={className} {...props} />;
}

/* -------------------------------------------------------------------------------------------------
 * Text
 * -----------------------------------------------------------------------------------------------*/
function InputGroupText({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="input-group-text" className={cn('text-sm', className)} {...props} />;
}

const InputGroup = Object.assign(InputGroupRoot, {
  Root: InputGroupRoot,
  Input: InputGroupInput,
  Addon: InputGroupAddon,
  Button: InputGroupButton,
  Text: InputGroupText,
});

export {
  InputGroup,
  inputGroupAddonVariants,
  type InputGroupAddonProps,
  type InputGroupButtonProps,
};
