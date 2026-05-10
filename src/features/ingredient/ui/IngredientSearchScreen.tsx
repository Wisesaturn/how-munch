'use client';

import { useEffect, useMemo, useState } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { subDays, subMonths, format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { debounce, groupBy } from 'es-toolkit';
import { ChevronLeft, Search, X } from 'lucide-react';
import { useConditionalEffect } from 'react-simplikit';
import { useIntersectionObserver } from 'usehooks-ts';

import { Button, Chip, ChipRow, InputGroup } from '@/commons/ui';

import { type Ingredient } from '@/entities/ingredient';
import { useIngredientCategory } from '@/entities/ingredient-category';

import { useIngredientSearchInfiniteQuery } from '../api/queries';

import { IngredientItem } from './IngredientItem';

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

type PeriodKey = '일주일' | '1개월' | '3개월' | '6개월' | '1년';

const PERIODS: PeriodKey[] = ['일주일', '1개월', '3개월', '6개월', '1년'];

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/

function computeDateRange(period: PeriodKey): { startDate: string; endDate: string } {
  const today = new Date();
  const endDate = format(today, 'yyyy-MM-dd');

  switch (period) {
    case '일주일':
      return { startDate: format(subDays(today, 7), 'yyyy-MM-dd'), endDate };
    case '1개월':
      return { startDate: format(subMonths(today, 1), 'yyyy-MM-dd'), endDate };
    case '3개월':
      return { startDate: format(subMonths(today, 3), 'yyyy-MM-dd'), endDate };
    case '6개월':
      return { startDate: format(subMonths(today, 6), 'yyyy-MM-dd'), endDate };
    case '1년':
      return { startDate: format(subMonths(today, 12), 'yyyy-MM-dd'), endDate };
  }
}

/* -------------------------------------------------------------------------------------------------
 * IngredientSearchScreen
 * -----------------------------------------------------------------------------------------------*/

interface IngredientSearchScreenProps {
  householdId: string;
  onClose: () => void;
  onIngredientSelect: (ingredient: Ingredient) => void;
}

export function IngredientSearchScreen({
  householdId,
  onClose,
  onIngredientSelect,
}: IngredientSearchScreenProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [period, setPeriod] = useState<PeriodKey>('1개월');

  const applyDebounce = useMemo(
    () => debounce((value: string) => setDebouncedQuery(value), 300),
    [],
  );

  function updateQuery(value: string) {
    setQuery(value);
    applyDebounce(value);
  }

  useEffect(
    function cancelDebounceOnUnmount() {
      return () => applyDebounce.cancel();
    },
    [applyDebounce],
  );

  const { startDate, endDate } = computeDateRange(period);

  const { getCategoryById } = useIngredientCategory(householdId);

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useIngredientSearchInfiniteQuery(householdId, startDate, endDate, debouncedQuery);

  const allItems = data?.pages.flatMap((page) => page.contents) ?? [];
  const grouped = Object.entries(groupBy(allItems, (item) => item.date)).sort(([a], [b]) =>
    b.localeCompare(a),
  );

  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({ threshold: 0.1 });

  useConditionalEffect(
    function fetchNextOnIntersect() {
      fetchNextPage();
    },
    [isIntersecting, hasNextPage, isFetchingNextPage] as const,
    (_, [intersecting, hasNext, fetching]) => intersecting && hasNext && !fetching,
  );

  const trimmedQuery = debouncedQuery.trim();

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: (
          <InputGroup className="border-none border-gray-200">
            <InputGroup.Input
              type="text"
              value={query}
              onChange={(e) => updateQuery(e.target.value)}
              placeholder="품목명 검색"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            {query && (
              <InputGroup.Button
                variant="ghost"
                onClick={() => updateQuery('')}
                aria-label="검색어 지우기"
              >
                <X className="size-3.5" />
              </InputGroup.Button>
            )}
          </InputGroup>
        ),
        backButton: {
          render: () => (
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="뒤로가기">
              <ChevronLeft className="size-5" />
            </Button>
          ),
        },
      }}
    >
      <div className="flex flex-col">
        {/* 기간 필터 */}
        <div className="sticky top-0 z-10 bg-white px-4 py-3">
          <ChipRow>
            {PERIODS.map((p) => (
              <Chip key={p} selected={period === p} onClick={() => setPeriod(p)}>
                {p}
              </Chip>
            ))}
          </ChipRow>
        </div>

        {/* 빈 화면 — 검색어 없을 때 */}
        {!trimmedQuery && (
          <div className="flex flex-col items-center gap-2 py-20 text-gray-400">
            <Search className="size-10 text-gray-200" />
            <p className="text-sm">품목명을 입력해 검색하세요</p>
          </div>
        )}

        {/* 로딩 */}
        {trimmedQuery && isLoading && (
          <div className="flex justify-center py-12">
            <span className="text-sm text-gray-400">검색 중...</span>
          </div>
        )}

        {/* 검색 결과 없음 */}
        {trimmedQuery && !isLoading && allItems.length === 0 && (
          <div className="flex flex-col items-center gap-1 py-16 text-sm text-gray-400">
            <p>검색 결과가 없습니다</p>
            <p className="text-xs">기간 범위를 넓혀 다시 검색해 보세요</p>
          </div>
        )}

        {/* 검색 결과 리스트 */}
        {trimmedQuery && allItems.length > 0 && (
          <div className="flex flex-col gap-4 px-4 pb-6">
            {grouped.map(([date, items]) => (
              <div key={date} className="flex flex-col gap-1.5">
                <h3 className="px-1 text-xs font-semibold text-gray-500">
                  {format(new Date(date), 'M월 d일 (EEEE)', { locale: ko })}
                </h3>
                <div className="flex flex-col gap-1.5">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="text-foreground flex w-full appearance-none flex-col gap-1 rounded-lg border bg-white px-3 py-2.5 text-left"
                      onClick={() => onIngredientSelect(item)}
                    >
                      <IngredientItem
                        name={item.name}
                        brand={item.brand}
                        price={item.price}
                        count={item.count}
                        unit={item.unit}
                        store={item.store}
                        categoryLabel={getCategoryById(item.category_id)?.label ?? ''}
                        categoryEmoji={getCategoryById(item.category_id)?.emoji ?? ''}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* 무한 스크롤 sentinel */}
            <div ref={sentinelRef} className="py-2">
              {isFetchingNextPage && (
                <div className="flex justify-center">
                  <span className="text-xs text-gray-400">더 불러오는 중...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppScreen>
  );
}
