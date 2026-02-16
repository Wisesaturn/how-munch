'use client';

import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';
import { ChevronDown } from 'lucide-react';
import { Accordion as AccordionPrimitive } from 'radix-ui';

import { cn } from '../lib';
import { createSafeContext } from '../lib/context';

interface AccordionContextValue {
  variant: 'outlined' | 'enclosed' | 'borderless';
  invalid: boolean;
  disabled: boolean;
}

const [AccordionProvider, useAccordionContext] =
  createSafeContext<AccordionContextValue>('Accordion');

const ACCORDION_ROOT_VARIANTS = cva('w-full', {
  variants: {
    variant: {
      outlined: 'rounded-md border border-gray-200 bg-white',
      enclosed: 'rounded-md border border-gray-200 bg-white',
      borderless: 'border-0 bg-transparent',
    },
    invalid: {
      true: 'border-red-300',
      false: '',
    },
    disabled: {
      true: 'border-gray-200 bg-gray-50',
      false: '',
    },
  },
  compoundVariants: [
    {
      variant: 'borderless',
      invalid: true,
      className: 'border border-red-300',
    },
    {
      variant: 'borderless',
      disabled: true,
      className: 'border border-gray-200 bg-gray-50',
    },
  ],
  defaultVariants: {
    variant: 'outlined',
    invalid: false,
    disabled: false,
  },
});

const ACCORDION_ITEM_VARIANTS = cva('', {
  variants: {
    variant: {
      outlined: 'border-b border-gray-100 last:border-b-0',
      enclosed: 'border-b border-gray-100 last:border-b-0',
      borderless: 'border-b border-gray-100 last:border-b-0',
    },
    invalid: {
      true: 'border-red-100',
      false: '',
    },
    disabled: {
      true: 'border-gray-100',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'outlined',
    invalid: false,
    disabled: false,
  },
});

const ACCORDION_TRIGGER_VARIANTS = cva(
  'flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all outline-none',
  {
    variants: {
      invalid: {
        true: 'text-red-700',
        false: 'text-gray-900',
      },
      disabled: {
        true: 'cursor-not-allowed bg-gray-50 text-gray-400',
        false:
          'focus-visible:border-ring focus-visible:ring-ring/50 cursor-pointer hover:text-gray-950 focus-visible:ring-[3px]',
      },
    },
    defaultVariants: {
      invalid: false,
      disabled: false,
    },
  },
);

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/
type AccordionRootProps = React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root> &
  VariantProps<typeof ACCORDION_ROOT_VARIANTS> & {
    invalid?: boolean;
    disabled?: boolean;
  };

const AccordionRoot = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Root>,
  AccordionRootProps
>(({ className, variant = 'outlined', invalid = false, disabled = false, ...props }, ref) => {
  const normalizedVariant = variant ?? 'outlined';

  return (
    <AccordionProvider variant={normalizedVariant} invalid={invalid} disabled={disabled}>
      <AccordionPrimitive.Root
        ref={ref}
        data-slot="accordion"
        data-invalid={invalid}
        data-disabled={disabled}
        className={cn(
          ACCORDION_ROOT_VARIANTS({ variant: normalizedVariant, invalid, disabled }),
          className,
        )}
        {...props}
      />
    </AccordionProvider>
  );
});
AccordionRoot.displayName = 'Accordion';

/* -------------------------------------------------------------------------------------------------
 * Item
 * -----------------------------------------------------------------------------------------------*/
const AccordionItem = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => {
  const { variant, invalid, disabled } = useAccordionContext();

  return (
    <AccordionPrimitive.Item
      ref={ref}
      data-slot="accordion-item"
      data-invalid={invalid}
      data-disabled={disabled}
      className={cn(ACCORDION_ITEM_VARIANTS({ variant, invalid, disabled }), className)}
      disabled={disabled || props.disabled}
      {...props}
    />
  );
});
AccordionItem.displayName = 'Accordion.Item';

/* -------------------------------------------------------------------------------------------------
 * Trigger
 * -----------------------------------------------------------------------------------------------*/
const AccordionTrigger = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, disabled, ...props }, ref) => {
  const { invalid, disabled: rootDisabled } = useAccordionContext();
  const isDisabled = Boolean(rootDisabled || disabled);

  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        data-slot="accordion-trigger"
        data-invalid={invalid}
        data-disabled={isDisabled}
        disabled={isDisabled}
        className={cn(
          ACCORDION_TRIGGER_VARIANTS({ invalid, disabled: isDisabled }),
          '[&[data-state=open]>svg]:rotate-180',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          className={cn(
            'pointer-events-none size-4 shrink-0 transition-transform duration-200',
            isDisabled ? 'text-gray-300' : 'text-muted-foreground',
          )}
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
});
AccordionTrigger.displayName = 'Accordion.Trigger';

/* -------------------------------------------------------------------------------------------------
 * Content
 * -----------------------------------------------------------------------------------------------*/
const AccordionContent = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    data-slot="accordion-content"
    className={cn(
      'overflow-hidden text-sm',
      'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
      className,
    )}
    {...props}
  >
    <div className="pb-4">{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = 'Accordion.Content';

const Accordion = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
});

export { Accordion };
