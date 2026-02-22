import * as React from 'react';

import { cn } from '../lib';

import { type TextareaProps } from './Textarea';

type TextareaOffset = 'none' | 'sm' | 'md';

interface TextareaGroupProps extends React.ComponentProps<'div'> {
  topLeftElement?: React.ReactNode;
  topRightElement?: React.ReactNode;
  bottomLeftElement?: React.ReactNode;
  bottomRightElement?: React.ReactNode;
  topOffset?: TextareaOffset;
  bottomOffset?: TextareaOffset;
  children: React.ReactElement;
}

function TextareaGroupElement({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="textarea-group-element"
      className={cn('text-muted-foreground pointer-events-none absolute m-2 flex-1', className)}
      {...props}
    />
  );
}

TextareaGroupElement.displayName = 'TextareaGroup.Element';

function TextareaGroup({
  className,
  topLeftElement,
  topRightElement,
  bottomLeftElement,
  bottomRightElement,
  topOffset = 'sm',
  bottomOffset = 'sm',
  children,
  ...props
}: TextareaGroupProps) {
  const child = React.Children.only<React.ReactElement>(children);
  const childProps = child.props as Partial<TextareaProps>;

  const hasTopElement = Boolean(topLeftElement || topRightElement);
  const hasBottomElement = Boolean(bottomLeftElement || bottomRightElement);

  return (
    <div
      data-slot="textarea-group"
      className={cn(
        'has-[:focus-visible]:border-ring has-[:focus-visible]:ring-ring/50 relative min-h-[96px] w-full rounded-md border border-gray-300 bg-white transition-[color,box-shadow] has-[:focus-visible]:ring-[3px]',
        'has-[:disabled]:cursor-not-allowed has-[:disabled]:border-gray-200 has-[:disabled]:bg-gray-50 has-[:disabled]:text-gray-400',
        'has-[[data-slot=textarea][data-invalid=true]]:border-red-500 has-[[data-slot=textarea][data-invalid=true]]:has-[:focus-visible]:border-red-600 has-[[data-slot=textarea][data-invalid=true]]:has-[:focus-visible]:ring-red-200',
        className,
      )}
      {...props}
    >
      {topLeftElement ? (
        <TextareaGroupElement className="top-0 left-0">{topLeftElement}</TextareaGroupElement>
      ) : null}
      {topRightElement ? (
        <TextareaGroupElement className="top-0 right-0">{topRightElement}</TextareaGroupElement>
      ) : null}

      {React.cloneElement(child, {
        ...childProps,
        'data-wrapped-within-textarea-group': true,
        topOffset: hasTopElement ? topOffset : 'none',
        bottomOffset: hasBottomElement ? bottomOffset : 'none',
        className: cn('w-full', childProps.className),
      } as TextareaProps)}

      {bottomLeftElement ? (
        <TextareaGroupElement className="bottom-0 left-0">{bottomLeftElement}</TextareaGroupElement>
      ) : null}
      {bottomRightElement ? (
        <TextareaGroupElement className="right-0 bottom-0">
          {bottomRightElement}
        </TextareaGroupElement>
      ) : null}
    </div>
  );
}

TextareaGroup.displayName = 'TextareaGroup';

export { TextareaGroup, TextareaGroupElement, type TextareaGroupProps };
