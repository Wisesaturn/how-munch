'use client';

import { useMemo, useState } from 'react';

import { getDate, getDaysInMonth } from 'date-fns';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/commons/lib';

import { type Ingredient } from '@/entities/ingredient';

interface WeeklyStatsProps {
  ingredients: Ingredient[];
  year: number;
  month: number;
}

/** 날짜를 주차(1~5)로 변환 */
function getWeekOfMonth(dateStr: string): number {
  const day = getDate(new Date(dateStr));
  return Math.ceil(day / 7);
}

/** 해당 월의 총 주차 수 */
function getTotalWeeks(year: number, month: number): number {
  const days = getDaysInMonth(new Date(year, month - 1));
  return Math.ceil(days / 7);
}

export function WeeklyStats({ ingredients, year, month }: WeeklyStatsProps) {
  const [open, setOpen] = useState(false);

  const weeklyData = useMemo(() => {
    const totalWeeks = getTotalWeeks(year, month);
    const weeks = Array.from({ length: totalWeeks }, (_, i) => ({
      week: i + 1,
      total: 0,
    }));

    for (const item of ingredients) {
      const w = getWeekOfMonth(item.date);
      const idx = Math.min(w, totalWeeks) - 1;
      weeks[idx].total += item.price;
    }

    return weeks;
  }, [ingredients, year, month]);

  const totalSpending = ingredients.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="rounded-xl border bg-white">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">주차별 통계</span>
          <span className="text-xs font-semibold text-emerald-600">
            {totalSpending.toLocaleString()}원
          </span>
        </div>
        <ChevronDown
          className={cn('size-4 text-gray-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="border-t px-4 pt-2 pb-3">
          {weeklyData.map(({ week, total }) => (
            <div key={week} className="flex items-center justify-between py-1.5">
              <span className="text-xs text-gray-500">{week}주차</span>
              <span className="text-xs font-medium">{total.toLocaleString()}원</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
