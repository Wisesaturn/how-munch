'use client';

import { cn } from '../lib';

interface ProgressBarProps extends React.ComponentProps<'div'> {
  value: number;
  max?: number;
}

function ProgressBar({ value, max = 100, className, ...props }: ProgressBarProps) {
  const percentage = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const isDepleted = percentage >= 100;

  return (
    <div
      data-slot="progress-bar"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn('bg-secondary h-2 w-full overflow-hidden rounded-full', className)}
      {...props}
    >
      <div
        className={cn(
          'h-full rounded-full transition-all duration-300',
          isDepleted ? 'bg-destructive' : 'bg-emerald-500',
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export { ProgressBar };
