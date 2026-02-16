'use client';

import * as React from 'react';

import { Switch as SwitchPrimitive } from 'radix-ui';

import { cn } from '../lib';

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/
const SwitchRoot = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    data-slot="switch"
    className={cn(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-gray-200 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:bg-gray-200 data-[state=checked]:bg-emerald-600',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      data-slot="switch-thumb"
      className={cn(
        'pointer-events-none block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
      )}
    />
  </SwitchPrimitive.Root>
));

SwitchRoot.displayName = 'Switch';

export { SwitchRoot as Switch };
