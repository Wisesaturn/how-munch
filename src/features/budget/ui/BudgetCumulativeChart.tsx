'use client';

import { useMemo } from 'react';

import { motion, useReducedMotion } from 'framer-motion';

/* -------------------------------------------------------------------------------------------------
 * Geometry
 *
 * 선 2개 + 기준선 1개뿐이라 차트 라이브러리를 들이지 않고 SVG로 직접 그린다.
 * -----------------------------------------------------------------------------------------------*/

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 140;
const PADDING_X = 8;
const PADDING_Y = 12;

function toPath(values: number[], dayCount: number, maxValue: number): string | null {
  if (values.length === 0) return null;

  const innerWidth = VIEW_WIDTH - PADDING_X * 2;
  const innerHeight = VIEW_HEIGHT - PADDING_Y * 2;
  // 하루짜리 데이터도 점이 아니라 선으로 보이도록 최소 1칸을 확보한다.
  const stepDenominator = Math.max(dayCount - 1, 1);

  return values
    .map((value, index) => {
      const x = PADDING_X + (index / stepDenominator) * innerWidth;
      const y = PADDING_Y + innerHeight - (maxValue > 0 ? value / maxValue : 0) * innerHeight;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

/* -------------------------------------------------------------------------------------------------
 * BudgetCumulativeChart
 * -----------------------------------------------------------------------------------------------*/

interface BudgetCumulativeChartProps {
  /** 대상 월의 일자별 누적 지출 */
  currentSeries: number[];
  /** 직전 월의 일자별 누적 지출 */
  previousSeries: number[];
  /** 대상 월의 일수 */
  dayCount: number;
  /** 전체 예산 — 미설정이면 기준선을 그리지 않는다 */
  budgetAmount: number | null;
  currentLabel: string;
  previousLabel: string;
}

export function BudgetCumulativeChart({
  currentSeries,
  previousSeries,
  dayCount,
  budgetAmount,
  currentLabel,
  previousLabel,
}: BudgetCumulativeChartProps) {
  const shouldReduceMotion = useReducedMotion();

  const { currentPath, previousPath, budgetY, maxValue } = useMemo(() => {
    const peak = Math.max(
      currentSeries.at(-1) ?? 0,
      previousSeries.at(-1) ?? 0,
      budgetAmount ?? 0,
      1,
    );
    const innerHeight = VIEW_HEIGHT - PADDING_Y * 2;

    return {
      currentPath: toPath(currentSeries, dayCount, peak),
      previousPath: toPath(previousSeries, dayCount, peak),
      budgetY:
        budgetAmount === null
          ? null
          : PADDING_Y + innerHeight - (budgetAmount / peak) * innerHeight,
      maxValue: peak,
    };
  }, [currentSeries, previousSeries, dayCount, budgetAmount]);

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="h-36 w-full"
        role="img"
        aria-label={`${currentLabel} 누적 식비 그래프. 최대 ${maxValue.toLocaleString()}원`}
      >
        {budgetY !== null && (
          <line
            x1={PADDING_X}
            x2={VIEW_WIDTH - PADDING_X}
            y1={budgetY}
            y2={budgetY}
            stroke="currentColor"
            className="text-gray-400"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        )}

        {previousPath && (
          <path
            d={previousPath}
            fill="none"
            stroke="currentColor"
            className="text-gray-400"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {currentPath && (
          <motion.path
            d={currentPath}
            fill="none"
            stroke="currentColor"
            className="text-emerald-500"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={shouldReduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.6, ease: 'easeInOut' }}
          />
        )}
      </svg>

      <ul className="flex items-center justify-center gap-4 text-xs text-gray-500">
        <li className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-emerald-500" aria-hidden />
          {currentLabel}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-gray-400" aria-hidden />
          {previousLabel}
        </li>
        {budgetAmount !== null && (
          <li className="flex items-center gap-1.5">
            <span className="h-0 w-4 border-t border-dashed border-gray-400" aria-hidden />
            예산
          </li>
        )}
      </ul>
    </div>
  );
}
