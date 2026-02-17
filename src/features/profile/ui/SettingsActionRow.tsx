'use client';

import { ChevronRight } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/commons/lib';

const settingsActionRowVariants = cva(
  'flex min-h-12 w-full items-center justify-between rounded-lg border bg-white px-4 py-3 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400',
  {
    variants: {
      tone: {
        default: 'border-gray-200 text-gray-900 hover:bg-gray-50',
        danger: 'border-red-200 text-red-600 hover:bg-red-50',
      },
    },
    defaultVariants: {
      tone: 'default',
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
  tone,
  className,
}: SettingsActionRowProps & SettingsActionRowVariantProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(settingsActionRowVariants({ tone }), className)}
    >
      <span className="truncate">{label}</span>
      <ChevronRight
        className={cn('size-4', tone === 'danger' ? 'text-red-300' : 'text-gray-400')}
      />
    </button>
  );
}
