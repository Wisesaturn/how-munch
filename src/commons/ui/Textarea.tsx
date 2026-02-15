import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib';

const textareaVariants = cva(
  'border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      resize: {
        none: 'resize-none',
        vertical: 'resize-y',
        horizontal: 'resize-x',
        both: 'resize',
      },
      topOffset: {
        none: '',
        sm: 'mt-8',
        md: 'mt-10',
      },
      bottomOffset: {
        none: '',
        sm: 'mb-8',
        md: 'mb-10',
      },
    },
    defaultVariants: {
      resize: 'none',
      topOffset: 'none',
      bottomOffset: 'none',
    },
  },
);

interface TextareaProps
  extends Omit<React.ComponentProps<'textarea'>, 'color'>, VariantProps<typeof textareaVariants> {
  invalid?: boolean;
  'data-wrapped-within-textarea-group'?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>((props, ref) => {
  const {
    className,
    invalid = false,
    resize,
    topOffset,
    bottomOffset,
    'aria-invalid': ariaInvalid,
    'data-wrapped-within-textarea-group': wrappedWithinTextareaGroup = false,
    ...rest
  } = props;

  const isInvalid = Boolean(invalid || ariaInvalid);

  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      data-invalid={isInvalid}
      aria-invalid={isInvalid}
      className={cn(
        textareaVariants({
          resize,
          topOffset: wrappedWithinTextareaGroup ? topOffset : 'none',
          bottomOffset: wrappedWithinTextareaGroup ? bottomOffset : 'none',
        }),
        'data-[invalid=true]:border-red-500 data-[invalid=true]:focus-visible:border-red-600 data-[invalid=true]:focus-visible:ring-red-200',
        wrappedWithinTextareaGroup &&
          'border-0 shadow-none focus-visible:border-transparent focus-visible:ring-0',
        className,
      )}
      {...rest}
    />
  );
});

Textarea.displayName = 'Textarea';

export { Textarea, textareaVariants, type TextareaProps };
