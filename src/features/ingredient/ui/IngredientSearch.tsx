'use client';

import { Search, X } from 'lucide-react';

import { cn } from '@/commons/lib';
import { Input } from '@/commons/ui';

interface IngredientSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function IngredientSearch({ value, onChange, className }: IngredientSearchProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        placeholder="품목명 검색"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-8 pl-9"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-0.5 transition-colors"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
