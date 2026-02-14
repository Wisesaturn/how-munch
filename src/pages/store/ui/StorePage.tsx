'use client';

import { useMemo, useState } from 'react';

import { addMonths, format, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { overlay } from 'overlay-kit';

import { Button } from '@/commons/ui';

import { type Ingredient } from '@/entities/ingredient';

import {
  IngredientAddBottomSheet,
  IngredientEditBottomSheet,
  IngredientList,
  IngredientSearch,
  useDeleteIngredientMutation,
  useIngredientsQuery,
  WeeklyStats,
} from '@/features/ingredient';

interface StorePageProps {
  householdId: string;
  userId: string;
}

export function StorePage({ householdId, userId }: StorePageProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [search, setSearch] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: ingredients = [], isLoading } = useIngredientsQuery(householdId, year, month);
  const deleteMutation = useDeleteIngredientMutation();

  const filtered = useMemo(() => {
    if (!search.trim()) return ingredients;
    const q = search.trim().toLowerCase();
    return ingredients.filter((item) => item.name.toLowerCase().includes(q));
  }, [ingredients, search]);

  const totalSpending = ingredients.reduce((sum, item) => sum + item.price, 0);

  const handlePrevMonth = () => setCurrentDate((d) => subMonths(d, 1));
  const handleNextMonth = () => setCurrentDate((d) => addMonths(d, 1));

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const createOverlayCloseHandler = (close: () => void, unmount: () => void) => {
    close();
    window.setTimeout(unmount, 200);
  };

  const openIngredientAddSheet = (defaultName?: string) => {
    overlay.open(({ isOpen, close, unmount }) => (
      <IngredientAddBottomSheet
        open={isOpen}
        onClose={() => createOverlayCloseHandler(close, unmount)}
        householdId={householdId}
        userId={userId}
        defaultName={defaultName}
      />
    ));
  };

  const openIngredientEditSheet = (ingredient: Ingredient) => {
    overlay.open(({ isOpen, close, unmount }) => (
      <IngredientEditBottomSheet
        open={isOpen}
        onClose={() => createOverlayCloseHandler(close, unmount)}
        ingredient={ingredient}
        householdId={householdId}
      />
    ));
  };

  const handleAddFromSearch = () => {
    openIngredientAddSheet(search.trim());
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      {/* 월 선택 헤더 + 총 지출 */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={handlePrevMonth}>
            <ChevronLeft className="size-4" />
          </Button>
          <h1 className="text-base font-bold">
            {format(currentDate, 'yyyy년 M월', { locale: ko })}
          </h1>
          <Button variant="ghost" size="icon-sm" onClick={handleNextMonth}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <span className="text-sm font-semibold text-emerald-600">
          {totalSpending.toLocaleString()}원
        </span>
      </header>

      {/* 검색 */}
      <IngredientSearch value={search} onChange={setSearch} />

      {/* 검색 결과 없을 때 바로 추가 */}
      {search.trim() && filtered.length === 0 && !isLoading && (
        <div className="flex items-center justify-center py-2">
          <Button variant="outline" size="sm" onClick={handleAddFromSearch}>
            &apos;{search.trim()}&apos; 바로 추가
          </Button>
        </div>
      )}

      {/* 주차별 통계 */}
      {!search.trim() && ingredients.length > 0 && (
        <WeeklyStats ingredients={ingredients} year={year} month={month} />
      )}

      {/* 장보기 리스트 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="text-sm text-gray-400">불러오는 중...</span>
        </div>
      ) : (
        <IngredientList
          ingredients={filtered}
          onEdit={openIngredientEditSheet}
          onDelete={handleDelete}
        />
      )}

      {/* FAB 추가 버튼 */}
      <Button
        onClick={() => openIngredientAddSheet()}
        className="fixed right-4 bottom-24 z-40 size-12 rounded-full shadow-lg sm:right-[calc(50%-215px+16px)]"
        size="icon-lg"
      >
        <Plus className="size-5" />
      </Button>
    </div>
  );
}
