'use client';

import { useEffect, useRef, useState } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { josa } from 'es-hangul';
import { Link2, Search, X } from 'lucide-react';

import { Badge, Button, InputGroup } from '@/commons/ui';

import { SearchSynonymLinkSheet, useSearchFilter } from '@/entities/search-synonym';

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

/** 재고 항목에서 검색 대상이 되는 텍스트 — 품목명과 브랜드를 함께 본다 */
function getFridgeItemSearchTexts(item: FridgeItemSearchOption) {
  return item.brand ? [item.name, item.brand] : [item.name];
}

/** 식단 재고 선택 전용 Screen — 같은 이름이라도 브랜드별로 구분해 보여주고 id로 선택한다 */
export function FridgeItemSearchScreen({
  onClose: _onClose,
  onSelectItem,
  items = [],
  fieldLabel = '재료',
}: FridgeItemSearchScreenProps) {
  const [query, setQuery] = useState('');
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(function focusOnMount() {
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => window.clearTimeout(timer);
  }, []);

  const trimmedQuery = query.trim();
  const { exact, similar } = useSearchFilter(items, query, getFridgeItemSearchTexts);
  const hasAnyResult = exact.length > 0 || similar.length > 0;

  function clearQuery() {
    setQuery('');
    inputRef.current?.focus();
  }

  function renderItem(item: FridgeItemSearchOption) {
    return (
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
    );
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

        {/* 직접 일치 */}
        {exact.length > 0 && <ul className="divide-y divide-gray-100">{exact.map(renderItem)}</ul>}

        {/* 유사어로 찾은 결과 — 경계를 드러내야 잘못 고르는 사고를 막는다 */}
        {similar.length > 0 && (
          <>
            <p className="bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500">유사어 매칭</p>
            <ul className="divide-y divide-gray-100">{similar.map(renderItem)}</ul>
          </>
        )}

        {!hasAnyResult && trimmedQuery && (
          <div className="flex flex-col items-center py-12 text-sm text-gray-400">
            <p>일치하는 재고가 없습니다</p>
          </div>
        )}
        {!hasAnyResult && !trimmedQuery && (
          <div className="flex flex-col items-center py-12 text-sm text-gray-400">
            <p>등록된 재고가 없습니다</p>
          </div>
        )}

        {/* 못 찾은 그 자리에서 유사어를 등록하게 한다 */}
        {trimmedQuery && (
          <div className="px-4 py-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setLinkSheetOpen(true)}
            >
              <Link2 className="size-4" />
              유사어 추가하기
            </Button>
          </div>
        )}
      </div>

      <SearchSynonymLinkSheet
        open={linkSheetOpen}
        onClose={() => setLinkSheetOpen(false)}
        baseTerm={trimmedQuery}
      />
    </AppScreen>
  );
}
