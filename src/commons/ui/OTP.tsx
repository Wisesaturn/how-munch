'use client';

import * as React from 'react';

import { Minus } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  OTPInput as PrimitivesOTPInput,
  OTPInputContext,
  REGEXP_ONLY_DIGITS,
  type OTPInputProps as PrimitivesOTPInputProps,
} from 'input-otp';

import { createSafeContext } from '../lib/context';
import { cn } from '../lib';

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/
interface OTPContext extends Pick<VariantProps<typeof otpSlotVariants>, 'size'> {
  invalid?: boolean;
}

const [OTPProvider, useOTPContext] = createSafeContext<OTPContext>('OTP');

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/
type OTPProps = Omit<PrimitivesOTPInputProps, 'size' | 'render'> &
  Pick<VariantProps<typeof otpSlotVariants>, 'size'> & {
    invalid?: boolean;
  };

const OTPRoot = React.forwardRef<HTMLInputElement, OTPProps>((props, forwardedRef) => {
  const {
    className,
    pattern: patternProp,
    inputMode: inputModeProp,
    disabled = false,
    invalid = false,
    children,
    size = 'md',
    maxLength = 6,
    ...otpInputProps
  } = props;
  const pattern = inputModeProp === 'numeric' ? REGEXP_ONLY_DIGITS : (patternProp ?? undefined);

  return (
    <OTPProvider size={size} invalid={invalid}>
      <PrimitivesOTPInput
        ref={forwardedRef}
        maxLength={maxLength}
        pattern={pattern}
        data-invalid={invalid}
        aria-invalid={invalid}
        data-disabled={disabled}
        disabled={disabled}
        containerClassName={cn('group flex items-center gap-2', className)}
        {...otpInputProps}
      >
        {children}
      </PrimitivesOTPInput>
    </OTPProvider>
  );
});

OTPRoot.displayName = 'OTP';

/* -------------------------------------------------------------------------------------------------
 * Group
 * -----------------------------------------------------------------------------------------------*/
interface OTPGroupProps extends React.ComponentProps<'div'> {
  className?: string;
}

const OTPGroup = React.forwardRef<HTMLDivElement, OTPGroupProps>((props, forwardedRef) => {
  const { className, ...groupProps } = props;

  return (
    <div
      ref={forwardedRef}
      data-slot="otp-group"
      className={cn(
        'flex items-center overflow-hidden rounded-md border border-gray-300 bg-white',
        '[&>[data-slot=otp-slot]]:border-0',
        '[&>[data-slot=otp-slot]]:rounded-none',
        '[&>[data-slot=otp-slot]:first-child]:rounded-l-md',
        '[&>[data-slot=otp-slot]:last-child]:rounded-r-md',
        '[&>[data-slot=otp-slot]+[data-slot=otp-slot]]:border-l',
        '[&>[data-slot=otp-slot]+[data-slot=otp-slot]]:border-gray-300',
        className,
      )}
      {...groupProps}
    />
  );
});

OTPGroup.displayName = 'OTP.Group';

/* -------------------------------------------------------------------------------------------------
 * Slot
 * -----------------------------------------------------------------------------------------------*/
const otpSlotVariants = cva(
  'relative flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-900 transition-all duration-200 ring-inset',
  {
    variants: {
      size: {
        sm: 'size-11 text-xl',
        md: 'size-12 text-2xl',
        lg: 'size-[3.25rem] text-3xl',
      },
      isActive: {
        true: 'bg-white ring-emerald-500',
        false: '',
      },
      invalid: {
        true: 'border-red-400 bg-white',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      isActive: false,
      invalid: false,
    },
    compoundVariants: [
      {
        size: 'sm',
        isActive: true,
        className: 'ring-[3px]',
      },
      {
        size: 'md',
        isActive: true,
        className: 'ring-4',
      },
      {
        size: 'lg',
        isActive: true,
        className: 'ring-4',
      },
    ],
  },
);

const otpCaretVariants = cva(
  'animate-otp-caret-blink rounded-full shadow-[0_0_0_1px_rgba(5,150,105,0.2)]',
  {
    variants: {
      size: {
        sm: 'h-6 w-[2px]',
        md: 'h-7 w-[2px]',
        lg: 'h-8 w-[2px]',
      },
      invalid: {
        true: 'bg-red-500',
        false: 'bg-emerald-600',
      },
    },
    defaultVariants: {
      size: 'md',
      invalid: false,
    },
  },
);

interface OTPSlotProps extends React.ComponentProps<'div'> {
  className?: string;
  index: number;
}

const OTPSlot = React.forwardRef<HTMLDivElement, OTPSlotProps>((props, forwardedRef) => {
  const { index, className, ...slotProps } = props;
  const slot = React.useContext(OTPInputContext)?.slots[index] ?? null;
  const { size, invalid } = useOTPContext('OTPSlot');

  if (!slot) return null;

  return (
    <div
      ref={forwardedRef}
      data-slot="otp-slot"
      className={cn(
        otpSlotVariants({
          size,
          isActive: slot.isActive,
          invalid,
        }),
        'group-has-[:disabled]:cursor-not-allowed group-has-[:disabled]:border-gray-200 group-has-[:disabled]:bg-gray-100 group-has-[:disabled]:text-gray-300 group-has-[:disabled]:ring-0',
        className,
      )}
      {...slotProps}
    >
      <div className="group-has-[input[data-input-otp-placeholder-shown]]:opacity-30">
        {slot.char ?? slot.placeholderChar}
      </div>
      {slot.hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className={otpCaretVariants({ size, invalid })} />
        </div>
      )}
    </div>
  );
});

OTPSlot.displayName = 'OTP.Slot';

/* -------------------------------------------------------------------------------------------------
 * Separator
 * -----------------------------------------------------------------------------------------------*/
interface OTPSeparatorProps extends React.ComponentProps<'div'> {
  className?: string;
}

const OTPSeparator = React.forwardRef<HTMLDivElement, OTPSeparatorProps>((props, forwardedRef) => {
  const { className, ...separatorProps } = props;

  return (
    <div
      ref={forwardedRef}
      data-slot="otp-separator"
      role="separator"
      aria-hidden
      className={cn('flex items-center text-gray-400', className)}
      {...separatorProps}
    >
      <Minus className="size-4" />
    </div>
  );
});

OTPSeparator.displayName = 'OTP.Separator';

const OTP = Object.assign(OTPRoot, {
  Root: OTPRoot,
  Group: OTPGroup,
  Slot: OTPSlot,
  Separator: OTPSeparator,
});

export { OTPRoot, OTPSlot, OTPGroup, OTPSeparator };
export { OTP, type OTPProps, type OTPSlotProps, type OTPGroupProps, type OTPSeparatorProps };
