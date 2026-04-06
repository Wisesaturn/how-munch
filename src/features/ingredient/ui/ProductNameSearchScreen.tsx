'use client';

import { useEffect, useRef, useState } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { useActions } from '@stackflow/react';
import { Search, X } from 'lucide-react';

import { cn } from '@/commons/lib';

import {
  resolveProductNameSelectCallback,
  unregisterProductNameSelectCallback,
} from '../model/productNameSearchStore';

interface ProductNameSearchScreenProps {
  /** 콜백 레지스트리 키 */
  callbackId: string;
  /** 검색 힌트 텍스트 (예: "재료명", "품목명") */
  fieldLabel?: string;
  /** 기존 이름 제안 목록 */
  suggestions?: string[];
}

/** 상품명 검색 전용 Screen — stackflow Activity로 사용하며 선택 시 pop 후 콜백으로 값을 전달한다 */
export function ProductNameSearchScreen({
  callbackId,
  fieldLabel = '상품명',
  suggestions = [],
}: ProductNameSearchScreenProps) {
  const { pop } = useActions();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(function focusOnMount() {
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => window.clearTimeout(timer);
  }, []);

  const trimmedQuery = query.trim();

  const filteredSuggestions = trimmedQuery
    ? suggestions.filter((name) => name.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : suggestions;

  const uniqueSuggestions = [...new Set(filteredSuggestions)];

  function selectName(name: string) {
    resolveProductNameSelectCallback(callbackId, name);
    pop();
  }

  function cancelSearch() {
    unregisterProductNameSelectCallback(callbackId);
    pop();
  }

  function submitQuery() {
    if (!trimmedQuery) return;
    selectName(trimmedQuery);
  }

  function clearQuery() {
    setQuery('');
    inputRef.current?.focus();
  }

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: `${fieldLabel} 검색`,
        renderRight: () => (
          <button
            type="button"
            onClick={cancelSearch}
            className="text-sm font-medium text-gray-500"
          >
            취소
          </button>
        ),
      }}
    >
      <div className="flex flex-col gap-0">
        {/* 검색 입력 */}
        <div className="sticky top-0 z-10 bg-white px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitQuery();
                }
              }}
              placeholder={`${fieldLabel}을 입력하세요`}
              className={cn(
                'border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border py-2 pr-9 pl-9 text-sm',
                'focus-visible:ring-1 focus-visible:outline-none',
              )}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            {query && (
              <button
                type="button"
                onClick={clearQuery}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-0.5 transition-colors"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* 직접 입력값으로 선택 */}
          {trimmedQuery && (
            <button
              type="button"
              onClick={submitQuery}
              className="mt-2 w-full rounded-md border border-dashed border-gray-300 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="px-3">
                <span className="text-gray-400">직접 입력: </span>
                <span className="font-medium">{trimmedQuery}</span>
              </span>
            </button>
          )}
        </div>

        {/* 제안 목록 */}
        {uniqueSuggestions.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {uniqueSuggestions.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => selectName(name)}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 active:bg-gray-100"
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {uniqueSuggestions.length === 0 && trimmedQuery && (
          <div className="flex flex-col items-center py-12 text-sm text-gray-400">
            <p>일치하는 기존 항목이 없습니다</p>
            <p className="mt-1">직접 입력 버튼으로 추가할 수 있습니다</p>
          </div>
        )}
        {uniqueSuggestions.length === 0 && !trimmedQuery && (
          <div className="flex flex-col items-center py-12 text-sm text-gray-400">
            <p>{fieldLabel}을 검색하거나 직접 입력하세요</p>
          </div>
        )}
      </div>
    </AppScreen>
  );
}
