'use client';

import { useEffect, useRef, useState } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { josa } from 'es-hangul';
import { Search, X } from 'lucide-react';

import { Badge, InputGroup } from '@/commons/ui';

import { type FridgeItemSearchOption } from '../lib';

interface FridgeItemSearchScreenProps {
  /** 화면 닫기 핸들러 (Activity에서 주입) */
  onClose: () => void;
  /** 재고 선택 핸들러 — 선택된 fridge_item_id를 반환한다 (Activity에서 주입) */
  onSelectItem: (fridgeItemId: string) => void;
  /** 선택 가능한 재고 목록 (브랜드별로 구분된 개별 항목) */
  items?: FridgeItemSearchOption[];
  /** 검색 힌트 텍스트 */
  fieldLabel?: string;
}

/** 식단 재고 선택 전용 Screen — 같은 이름이라도 브랜드별로 구분해 보여주고 id로 선택한다 */
export function FridgeItemSearchScreen({
  onClose: _onClose,
  onSelectItem,
  items = [],
  fieldLabel = '재료',
}: FridgeItemSearchScreenProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(function focusOnMount() {
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => window.clearTimeout(timer);
  }, []);

  const trimmedQuery = query.trim().toLowerCase();

  const filteredItems = trimmedQuery
    ? items.filter((item) => {
        const name = item.name.toLowerCase();
        const brand = (item.brand ?? '').toLowerCase();
        return name.includes(trimmedQuery) || brand.includes(trimmedQuery);
      })
    : items;

  function clearQuery() {
    setQuery('');
    inputRef.current?.focus();
  }

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: `${fieldLabel} 검색`,
      }}
    >
      <div className="flex flex-col gap-0">
        {/* 검색 입력 */}
        <div className="sticky top-0 z-10 bg-white px-4 pt-3 pb-2">
          <InputGroup>
            <InputGroup.Addon align="inline-start">
              <Search className="size-4" />
            </InputGroup.Addon>
            <InputGroup.Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`${josa(fieldLabel ?? '', '을/를')} 입력하세요`}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            {query && (
              <InputGroup.Addon align="inline-end" className="border-l-0 px-1">
                <InputGroup.Button type="button" onClick={clearQuery}>
                  <X className="size-4" />
                </InputGroup.Button>
              </InputGroup.Addon>
            )}
          </InputGroup>
        </div>

        {/* 재고 목록 */}
        {filteredItems.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {filteredItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelectItem(item.id)}
                  className="flex w-full items-start justify-between gap-2 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100"
                >
                  <span className="flex min-w-0 flex-col">
                    {item.brand ? (
                      <span className="truncate text-xs text-gray-400">{item.brand}</span>
                    ) : null}
                    <span className="truncate text-sm text-gray-900">{item.name}</span>
                  </span>
                  {item.depleted && (
                    <Badge
                      variant="outline"
                      className="mt-0.5 shrink-0 border-red-200 bg-red-50 px-1.5 py-0 text-[10px] text-red-600"
                    >
                      소진
                    </Badge>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        {filteredItems.length === 0 && trimmedQuery && (
          <div className="flex flex-col items-center py-12 text-sm text-gray-400">
            <p>일치하는 재고가 없습니다</p>
          </div>
        )}
        {filteredItems.length === 0 && !trimmedQuery && (
          <div className="flex flex-col items-center py-12 text-sm text-gray-400">
            <p>등록된 재고가 없습니다</p>
          </div>
        )}
      </div>
    </AppScreen>
  );
}
