'use client';

import * as React from 'react';

import { Slot } from 'radix-ui';

import { cn } from '../lib';
import { createSafeContext } from '../lib/context';

import { Message } from './Message';

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/
interface FormFieldContextValue {
  id: string;
  name: string;
  invalid: boolean;
  message: string | null;
}

const [FormFieldProvider, useFormFieldContext] =
  createSafeContext<FormFieldContextValue>('FormField');

interface TanstackAnyField {
  name: string;
  state: {
    meta: {
      errors: unknown[];
    };
  };
}

function extractErrorMessage(error: unknown): string | null {
  if (!error) return null;

  if (typeof error === 'string') {
    return error.trim() || null;
  }

  if (error instanceof Error) {
    return error.message.trim() || null;
  }

  if (Array.isArray(error)) {
    for (const item of error) {
      const message = extractErrorMessage(item);
      if (message) return message;
    }
    return null;
  }

  if (typeof error === 'object') {
    const record = error as Record<string, unknown>;

    const directMessage = extractErrorMessage(record.message);
    if (directMessage) return directMessage;

    const issuesMessage = extractErrorMessage(record.issues);
    if (issuesMessage) return issuesMessage;

    for (const value of Object.values(record)) {
      const nestedMessage = extractErrorMessage(value);
      if (nestedMessage) return nestedMessage;
    }
  }

  return null;
}

function resolveFieldMessage(field: TanstackAnyField) {
  return extractErrorMessage(field.state.meta.errors) ?? null;
}

function FormField({
  field,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & { field: TanstackAnyField }) {
  const id = React.useId();
  const message = resolveFieldMessage(field);
  const invalid = Boolean(message);

  return (
    <FormFieldProvider id={id} name={field.name} invalid={invalid} message={message}>
      <div
        data-slot="form-field"
        data-invalid={invalid}
        className={cn('grid gap-1.5', className)}
        {...props}
      >
        {children}
      </div>
    </FormFieldProvider>
  );
}

FormField.displayName = 'Form.Field';

/* -------------------------------------------------------------------------------------------------
 * Label
 * -----------------------------------------------------------------------------------------------*/
const FormLabel = React.forwardRef<
  HTMLLabelElement,
  React.ComponentProps<'label'> & {
    required?: boolean;
  }
>(({ className, required, children, ...props }, forwardedRef) => {
  const { id } = useFormFieldContext('Form.Label');

  return (
    <label
      ref={forwardedRef}
      htmlFor={id}
      className={cn(
        'relative inline-flex w-fit items-start text-sm font-medium text-gray-600',
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-0 -right-1 size-1 animate-ping rounded-full bg-orange-500/60"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-0 -right-1 size-1 rounded-full bg-orange-500"
          />
          <span className="sr-only">필수 입력</span>
        </>
      ) : null}
    </label>
  );
});

FormLabel.displayName = 'Form.Label';

/* -------------------------------------------------------------------------------------------------
 * Control
 * -----------------------------------------------------------------------------------------------*/
const FormControl = React.forwardRef<
  React.ComponentRef<typeof Slot.Root>,
  React.ComponentPropsWithoutRef<typeof Slot.Root> & {
    invalid?: boolean;
  }
>(({ className, invalid, ...props }, forwardedRef) => {
  const { id, invalid: fieldInvalid } = useFormFieldContext('Form.Control');
  const isInvalid = Boolean(invalid ?? fieldInvalid);

  return (
    <Slot.Root
      ref={forwardedRef}
      id={id}
      aria-invalid={isInvalid}
      data-invalid={isInvalid}
      className={className}
      {...props}
    />
  );
});

FormControl.displayName = 'Form.Control';

/* -------------------------------------------------------------------------------------------------
 * Error
 * -----------------------------------------------------------------------------------------------*/
const FormError = React.forwardRef<
  React.ComponentRef<typeof Message>,
  Omit<React.ComponentPropsWithoutRef<typeof Message>, 'children'>
>(({ className, ...props }, forwardedRef) => {
  const { id, message } = useFormFieldContext('Form.Error');

  return (
    <Message ref={forwardedRef} id={`${id}-message`} type="error" className={className} {...props}>
      {message}
    </Message>
  );
});

FormError.displayName = 'Form.Error';

const Form = Object.assign(
  {},
  {
    Field: FormField,
    Label: FormLabel,
    Control: FormControl,
    Error: FormError,
  },
);

export { Form };
