import * as React from 'react';

import { AlertCircle, Info } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib';

const messageVariants = cva('flex items-start gap-1.5 text-xs font-medium', {
  variants: {
    type: {
      error: 'text-red-600',
      info: 'text-blue-600',
    },
  },
  defaultVariants: {
    type: 'error',
  },
});

interface MessageProps
  extends Omit<React.ComponentProps<'p'>, 'children'>, VariantProps<typeof messageVariants> {
  children?: React.ReactNode;
}

const Message = React.forwardRef<HTMLParagraphElement, MessageProps>((props, ref) => {
  const { className, type = 'error', children, ...rest } = props;

  if (!children) return null;

  const Icon = type === 'error' ? AlertCircle : Info;

  return (
    <p ref={ref} data-slot="message" className={cn(messageVariants({ type, className }))} {...rest}>
      <Icon className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
});

Message.displayName = 'Message';

export { Message, messageVariants, type MessageProps };
