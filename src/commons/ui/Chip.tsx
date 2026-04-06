import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib';

/* ------------------------------------------------------------------------------------------------- */
/* Root */
/* ------------------------------------------------------------------------------------------------- */

const chipVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-150 select-none disabled:pointer-events-none disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400',
  {
    variants: {
      selected: {
        true: 'border-emerald-600 bg-emerald-600 text-white',
        false: 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
      },
    },
    defaultVariants: {
      selected: false,
    },
  },
);

interface ChipProps
  extends Omit<React.ComponentProps<'button'>, 'onChange'>, VariantProps<typeof chipVariants> {
  /** 선택 상태 */
  selected?: boolean;
  /** 선택 상태 변경 핸들러 */
  onSelectedChange?: (selected: boolean) => void;
}

function Chip({
  className,
  selected = false,
  onSelectedChange,
  onClick,
  disabled,
  ...props
}: ChipProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onSelectedChange?.(!selected);
    onClick?.(e);
  };

  return (
    <button
      data-slot="chip"
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={handleClick}
      className={cn(chipVariants({ selected, className }))}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------------------------------------- */
/* Row */
/* ------------------------------------------------------------------------------------------------- */

function ChipRow({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="chip-row"
      className={cn(
        'flex w-full min-w-0 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      {...props}
    />
  );
}

export { Chip, ChipRow, chipVariants };
