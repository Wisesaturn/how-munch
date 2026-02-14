import { cn } from '@/commons/lib';
import { Badge } from '@/commons/ui';

interface ExpiryBadgeProps {
  /** 유통기한까지 남은 일수. null이면 유통기한 미입력 */
  daysLeft: number | null;
  className?: string;
}

/** 유통기한 D-day 뱃지 */
export function ExpiryBadge({ daysLeft, className }: ExpiryBadgeProps) {
  if (daysLeft === null) {
    return (
      <Badge variant="outline" className={cn('text-gray-400', className)}>
        기한 없음
      </Badge>
    );
  }

  let label: string;
  if (daysLeft === 0) label = 'D-Day';
  else if (daysLeft > 0) label = `D-${daysLeft}`;
  else label = `D+${Math.abs(daysLeft)}`;

  const variant = daysLeft <= 0 ? 'destructive' : 'default';

  let colorClass = '';
  if (daysLeft > 0 && daysLeft <= 3) {
    colorClass = 'bg-amber-100 text-amber-700 hover:bg-amber-100';
  } else if (daysLeft > 3) {
    colorClass = 'bg-gray-100 text-gray-500 hover:bg-gray-100';
  }

  return (
    <Badge variant={variant} className={cn(colorClass, className)}>
      {label}
    </Badge>
  );
}
