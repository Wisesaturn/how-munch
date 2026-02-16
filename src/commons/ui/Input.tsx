import * as React from 'react';

import { cn } from '../lib';

interface InputProps extends React.ComponentProps<'input'> {
  invalid?: boolean;
  'data-wrapped-within-input-group'?: boolean;
}

function Input({
  className,
  type,
  invalid = false,
  'aria-invalid': ariaInvalid,
  'data-wrapped-within-input-group': wrappedWithinInputGroup = false,
  ...props
}: InputProps) {
  const isInvalid = Boolean(invalid || ariaInvalid);

  return (
    <input
      data-slot="input"
      type={type}
      aria-invalid={isInvalid}
      data-invalid={isInvalid}
      className={cn(
        'border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]',
        'disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:placeholder:text-gray-400',
        'data-[invalid=true]:border-red-500 data-[invalid=true]:focus-visible:border-red-600 data-[invalid=true]:focus-visible:ring-red-200',
        wrappedWithinInputGroup &&
          'rounded-none border-0 shadow-none focus-visible:border-transparent focus-visible:ring-0',
        className,
      )}
      {...props}
    />
  );
}

export { Input, type InputProps };
