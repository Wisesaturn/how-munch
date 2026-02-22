'use client';

import * as React from 'react';

import { Slider as SliderPrimitive } from 'radix-ui';

import { cn } from '../lib';

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/
const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    invalid?: boolean;
  }
>(({ className, invalid = false, 'aria-invalid': ariaInvalid, ...props }, ref) => {
  const isInvalid = Boolean(invalid || ariaInvalid);
  const thumbValues = props.value ?? props.defaultValue ?? [0];

  return (
    <SliderPrimitive.Root
      ref={ref}
      data-slot="slider"
      data-invalid={isInvalid}
      aria-invalid={isInvalid}
      className={cn(
        'relative flex w-full touch-none items-center select-none data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-3 w-full grow overflow-hidden rounded-full bg-gray-200 data-[disabled]:bg-gray-100">
        <SliderPrimitive.Range className="absolute h-full bg-emerald-500 data-[disabled]:bg-gray-300" />
      </SliderPrimitive.Track>
      {thumbValues.map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          className={cn(
            'block size-5 rounded-full border-2 border-emerald-600 bg-white shadow-sm transition-[box-shadow] outline-none',
            'hover:ring-4 hover:ring-emerald-100',
            'focus-visible:ring-4 focus-visible:ring-emerald-200',
            'data-[disabled]:border-gray-300 data-[disabled]:bg-gray-100',
            'data-[invalid=true]:border-red-500 data-[invalid=true]:hover:ring-red-100 data-[invalid=true]:focus-visible:ring-red-200',
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
});

Slider.displayName = 'Slider';

export { Slider };
