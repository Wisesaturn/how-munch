'use client';

import { cn } from '../lib';

interface ProgressBarProps extends React.ComponentProps<'div'> {
  value: number;
  max?: number;
}

/**
 * max가 0인데 쓴 값이 있으면 초과다. 0으로 나눌 수 없어 비율을 101로 고정한다.
 * 이 규칙이 없으면 "0원 예산에 지출 발생"이 101% 빨간 글자 옆 빈 초록 바로 어긋나 보인다.
 */
function resolveRatio(value: number, max: number): number {
  if (max > 0) return Math.round((value / max) * 100);
  return value > 0 ? 101 : 0;
}

function ProgressBar({ value, max = 100, className, ...props }: ProgressBarProps) {
  const ratio = resolveRatio(value, max);
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
