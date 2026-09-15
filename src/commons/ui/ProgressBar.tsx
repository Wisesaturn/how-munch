'use client';

import { cn } from '../lib';

interface ProgressBarProps extends React.ComponentProps<'div'> {
  value: number;
  max?: number;
}

function ProgressBar({ value, max = 100, className, ...props }: ProgressBarProps) {
  const ratio = max > 0 ? Math.round((value / max) * 100) : 0;
  // 바 길이는 100%에서 멈추고, 초과는 색으로 알린다.
  // 길이를 늘리면 컨테이너를 벗어나고, 색이 없으면 초과 자체를 표현할 수단이 사라진다.
  const percentage = Math.min(ratio, 100);
  const exceeded = ratio > 100;

  return (
    <div
      data-slot="progress-bar"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      data-exceeded={exceeded}
      className={cn('bg-secondary h-2 w-full overflow-hidden rounded-full', className)}
      {...props}
    >
      <div
        className={cn(
          'h-full rounded-full transition-all duration-300',
          exceeded ? 'bg-red-500' : 'bg-emerald-500',
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export { ProgressBar };
