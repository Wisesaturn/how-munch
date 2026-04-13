'use client';

import { useEffect, useRef, useState } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { Search, X } from 'lucide-react';

import { Badge, InputGroup } from '@/commons/ui';

interface ProductNameSearchScreenProps {
  /** 화면 닫기 핸들러 (Activity에서 주입) */
  onClose: () => void;
  /** 항목 선택 핸들러 (Activity에서 주입) */
  onSelectName: (name: string) => void;
  /** 검색 힌트 텍스트 (예: "재료명", "품목명") */
  fieldLabel?: string;
  /** 기존 이름 제안 목록 */
  suggestions?: string[];
  /** 소진 상태인 항목 이름 목록 — 해당 항목에 소진 뱃지를 표시한다 */
  depletedNames?: string[];
}

/** 상품명 검색 전용 Screen — onClose/onSelectName을 Activity에서 주입받아 동작한다 */
export function ProductNameSearchScreen({
  onClose: _onClose,
  onSelectName,
  fieldLabel = '상품명',
  suggestions = [],
  depletedNames = [],
}: ProductNameSearchScreenProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const depletedSet = new Set(depletedNames);

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

  function submitQuery() {
    if (!trimmedQuery) return;
    onSelectName(trimmedQuery);
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitQuery();
                }
              }}
              placeholder={`${fieldLabel}을 입력하세요`}
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

          {/* 직접 입력값으로 선택 */}
          {trimmedQuery && (
            <button
              type="button"
              onClick={submitQuery}
              className="mt-2 w-full rounded-md border border-dashed border-gray-300 bg-white py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
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
            {uniqueSuggestions.map((name) => {
              const isDepleted = depletedSet.has(name);
              return (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => onSelectName(name)}
                    className="flex w-full items-center gap-1.5 px-4 py-3 text-left text-sm hover:bg-gray-50 active:bg-gray-100"
                  >
                    <span>{name}</span>
                    {isDepleted && (
                      <Badge
                        variant="outline"
                        className="border-red-200 bg-red-50 px-1.5 py-0 text-[10px] text-red-600"
                      >
                        소진
                      </Badge>
                    )}
                  </button>
                </li>
              );
            })}
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
