'use client';

import { useState } from 'react';

import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { overlay } from 'overlay-kit';

import { stackFlowActions } from '@/apps/stackflow/StackFlow';

import { Button } from '@/commons/ui';

import { type Ingredient } from '@/entities/ingredient';

import { IngredientList, useIngredientsQuery, WeeklyStats } from '@/features/ingredient';

import { StoreAddMethodSheet } from './StoreAddMethodSheet';

interface StorePageProps {
  householdId: string;
  userId: string;
}

export function StorePage({ householdId, userId }: StorePageProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  const { data: ingredients = [], isLoading } = useIngredientsQuery(
    householdId,
    startDate,
    endDate,
  );

  const totalSpending = ingredients.reduce((sum, item) => sum + item.price, 0);

  const handlePrevMonth = () => setCurrentDate((d) => subMonths(d, 1));
  const handleNextMonth = () => setCurrentDate((d) => addMonths(d, 1));

  function openIngredientAdd(defaultName?: string) {
    stackFlowActions.push('IngredientAddActivity', {
      householdId,
      userId,
      defaultName,
      suggestions: ingredients.map((i) => i.name),
    });
  }

  function openPromptIngredientAdd() {
    stackFlowActions.push('PromptIngredientAddActivity', {
      householdId,
      userId,
      suggestions: ingredients.map((i) => i.name),
    });
  }

  const openIngredientEditSheet = (ingredient: Ingredient) => {
    stackFlowActions.push('IngredientEditActivity', {
      householdId,
      ingredient,
      suggestions: ingredients.map((i) => i.name),
    });
  };

  return (
    <div className="flex flex-col gap-4 px-4 pb-5">
      <section className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={handlePrevMonth}>
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="text-base font-bold">
            {format(currentDate, 'yyyy년 M월', { locale: ko })}
          </h2>
          <Button variant="ghost" size="icon-sm" onClick={handleNextMonth}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <span className="text-sm font-semibold text-emerald-600">
          {totalSpending.toLocaleString()}원
        </span>
      </section>

      {/* 주차별 통계 */}
      {ingredients.length > 0 && (
        <WeeklyStats ingredients={ingredients} year={year} month={month} />
      )}

      {/* 장보기 리스트 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="text-sm text-gray-400">불러오는 중...</span>
        </div>
      ) : (
        <IngredientList
          householdId={householdId}
          ingredients={ingredients}
          onEdit={openIngredientEditSheet}
        />
      )}

      {/* FAB 추가 버튼 */}
      <Button
        onClick={() => {
          overlay.open(({ isOpen, close, unmount }) => {
            function closeSheet() {
              close();
              window.setTimeout(unmount, 300);
            }
            return (
              <StoreAddMethodSheet
                open={isOpen}
                onClose={closeSheet}
                onDirectAdd={() => {
                  closeSheet();
                  openIngredientAdd();
                }}
                onPromptAdd={() => {
                  closeSheet();
                  openPromptIngredientAdd();
                }}
              />
            );
          });
        }}
        color="primary"
        className="fixed right-4 [bottom:calc(constant(safe-area-inset-bottom)+84px)] [bottom:calc(env(safe-area-inset-bottom)+84px)] z-40 size-12 rounded-full shadow-lg sm:right-[calc(50%-215px+16px)]"
        size="icon-lg"
      >
        <Plus className="size-5" />
      </Button>
    </div>
  );
}
