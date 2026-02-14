import { cn } from '../lib';

interface EmptyStateProps extends React.ComponentProps<'div'> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/* -------------------------------------------------------------------------------------------------
 * Icon
 * -----------------------------------------------------------------------------------------------*/
function EmptyStateIcon({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('text-muted-foreground mb-2', className)} {...props} />;
}
EmptyStateIcon.displayName = 'EmptyState.Icon';

/* -------------------------------------------------------------------------------------------------
 * Title
 * -----------------------------------------------------------------------------------------------*/
function EmptyStateTitle({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-sm font-medium text-gray-600', className)} {...props} />;
}
EmptyStateTitle.displayName = 'EmptyState.Title';

/* -------------------------------------------------------------------------------------------------
 * Description
 * -----------------------------------------------------------------------------------------------*/
function EmptyStateDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-muted-foreground text-xs', className)} {...props} />;
}
EmptyStateDescription.displayName = 'EmptyState.Description';

/* -------------------------------------------------------------------------------------------------
 * Action
 * -----------------------------------------------------------------------------------------------*/
function EmptyStateAction({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mt-3', className)} {...props} />;
}
EmptyStateAction.displayName = 'EmptyState.Action';

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/
function EmptyStateRoot({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn('flex flex-col items-center justify-center gap-2 py-12 text-center', className)}
      {...props}
    >
      {icon && <EmptyStateIcon>{icon}</EmptyStateIcon>}
      <EmptyStateTitle>{title}</EmptyStateTitle>
      {description && <EmptyStateDescription>{description}</EmptyStateDescription>}
      {action && <EmptyStateAction>{action}</EmptyStateAction>}
    </div>
  );
}
EmptyStateRoot.displayName = 'EmptyState';

const EmptyState = Object.assign(EmptyStateRoot, {
  Icon: EmptyStateIcon,
  Title: EmptyStateTitle,
  Description: EmptyStateDescription,
  Action: EmptyStateAction,
});

export { EmptyState };
