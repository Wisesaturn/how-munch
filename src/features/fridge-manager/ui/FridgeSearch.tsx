import { Search, X } from 'lucide-react';

import { Input } from '@/commons/ui';

interface FridgeSearchProps {
  value: string;
  onChange: (value: string) => void;
}

/** 냉장고 재고 검색 */
export function FridgeSearch({ value, onChange }: FridgeSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
      <Input
        type="text"
        placeholder="재료 검색..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-8 pl-9"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
