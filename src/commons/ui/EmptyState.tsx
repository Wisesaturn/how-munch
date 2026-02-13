import { cn } from '../lib';

interface EmptyStateProps extends React.ComponentProps<'div'> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn('flex flex-col items-center justify-center gap-2 py-12 text-center', className)}
      {...props}
    >
      {icon && <div className="text-muted-foreground mb-2">{icon}</div>}
      <p className="text-sm font-medium text-gray-600">{title}</p>
      {description && <p className="text-muted-foreground text-xs">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export { EmptyState };
