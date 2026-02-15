'use client';

import { cn, cva, type VariantProps } from '@/commons/lib';

const settingsActionRowVariants = cva(
  'flex h-12 w-full items-center justify-between px-4 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      color: {
        default: 'text-gray-900 hover:bg-gray-50',
        danger: 'text-red-600 hover:bg-red-50 hover:text-red-700',
      },
    },
    defaultVariants: {
      color: 'default',
    },
  },
);

interface SettingsActionRowProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}
type SettingsActionRowVariantProps = VariantProps<typeof settingsActionRowVariants>;

export function SettingsActionRow({
  label,
  onClick,
  disabled = false,
  color,
  className,
}: SettingsActionRowProps & SettingsActionRowVariantProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(settingsActionRowVariants({ color }), className)}
    >
      {label}
    </button>
  );
}
