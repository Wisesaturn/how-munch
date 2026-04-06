'use client';

import { Search, X } from 'lucide-react';

import { cn } from '@/commons/lib';
import { InputGroup } from '@/commons/ui';

interface IngredientSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function IngredientSearch({ value, onChange, className }: IngredientSearchProps) {
  return (
    <InputGroup className={cn(className)}>
      <InputGroup.Addon align="inline-start">
        <Search className="size-4" />
      </InputGroup.Addon>
      <InputGroup.Input
        placeholder="품목명 검색"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <InputGroup.Addon align="inline-end" className="border-l-0 px-1">
          <InputGroup.Button onClick={() => onChange('')}>
            <X className="size-4" />
          </InputGroup.Button>
        </InputGroup.Addon>
      )}
    </InputGroup>
  );
}
