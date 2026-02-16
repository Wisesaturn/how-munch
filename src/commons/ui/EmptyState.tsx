'use client';

import * as React from 'react';

import { cn, createSafeContext } from '../lib';

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/
interface EmptyStateContextValue {
  titleId: string;
  descriptionId: string;
}

const [EmptyStateProvider, useEmptyStateContext] =
  createSafeContext<EmptyStateContextValue>('EmptyState');

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/
function EmptyStateRoot({ className, children, ...props }: React.ComponentProps<'div'>) {
  const titleId = React.useId();
  const descriptionId = React.useId();

  return (
    <EmptyStateProvider titleId={titleId} descriptionId={descriptionId}>
      <div
        data-slot="empty-state"
        className={cn('flex flex-col items-center justify-center text-center', className)}
        {...props}
      >
        {children}
      </div>
    </EmptyStateProvider>
  );
}

EmptyStateRoot.displayName = 'EmptyState.Root';

/* -------------------------------------------------------------------------------------------------
 * Content
 * -----------------------------------------------------------------------------------------------*/
function EmptyStateContent({ className, ...props }: React.ComponentProps<'div'>) {
  const { titleId, descriptionId } = useEmptyStateContext('EmptyState.Content');

  return (
    <div
      data-slot="empty-state-content"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={cn('flex flex-col items-center gap-2 py-12', className)}
      {...props}
    />
  );
}

EmptyStateContent.displayName = 'EmptyState.Content';

/* -------------------------------------------------------------------------------------------------
 * Indicator
 * -----------------------------------------------------------------------------------------------*/
function EmptyStateIndicator({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-state-indicator"
      className={cn('text-muted-foreground mb-2', className)}
      {...props}
    />
  );
}

EmptyStateIndicator.displayName = 'EmptyState.Indicator';

/* -------------------------------------------------------------------------------------------------
 * Title
 * -----------------------------------------------------------------------------------------------*/
function EmptyStateTitle({ className, id, ...props }: React.ComponentProps<'p'>) {
  const { titleId } = useEmptyStateContext('EmptyState.Title');

  return (
    <p
      data-slot="empty-state-title"
      id={id ?? titleId}
      className={cn('text-sm font-medium text-gray-600', className)}
      {...props}
    />
  );
}

EmptyStateTitle.displayName = 'EmptyState.Title';

/* -------------------------------------------------------------------------------------------------
 * Description
 * -----------------------------------------------------------------------------------------------*/
function EmptyStateDescription({ className, id, ...props }: React.ComponentProps<'p'>) {
  const { descriptionId } = useEmptyStateContext('EmptyState.Description');

  return (
    <p
      data-slot="empty-state-description"
      id={id ?? descriptionId}
      className={cn('text-muted-foreground text-xs', className)}
      {...props}
    />
  );
}

EmptyStateDescription.displayName = 'EmptyState.Description';

/* -------------------------------------------------------------------------------------------------
 * Action
 * -----------------------------------------------------------------------------------------------*/
function EmptyStateAction({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="empty-state-action" className={cn('mt-3', className)} {...props} />;
}

EmptyStateAction.displayName = 'EmptyState.Action';

const EmptyState = Object.assign(EmptyStateRoot, {
  Root: EmptyStateRoot,
  Content: EmptyStateContent,
  Indicator: EmptyStateIndicator,
  Title: EmptyStateTitle,
  Description: EmptyStateDescription,
  Action: EmptyStateAction,
});

export { EmptyState };
