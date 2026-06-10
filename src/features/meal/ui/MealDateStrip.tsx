'use client';

import { useMemo, useState } from 'react';

import { addDays, addWeeks, format, isSameDay, isToday, startOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { overlay } from 'overlay-kit';

import { cn } from '@/commons/lib';
import { Button } from '@/commons/ui';

import { useMealSummaryByRangeQuery } from '../api/queries';

import { MealCalendarBottomSheet } from './MealCalendarBottomSheet';

/* -------------------------------------------------------------------------------------------------
 * Constants & Helpers
 * -----------------------------------------------------------------------------------------------*/

const WEEK_OPTIONS = { weekStartsOn: 0 } as const;

/** 주 이동으로 판정하는 드래그 거리(px)/속도(px/s) 임계값 */
const SWIPE_DISTANCE_THRESHOLD = 48;
const SWIPE_VELOCITY_THRESHOLD = 480;

/** 주 전환 슬라이드 — direction(±1) 기준 진입/이탈 방향, 0이면 페이드만 수행 */
const weekSlideVariants = {
  enter: (direction: number) => ({ x: direction * 32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction * -32, opacity: 0 }),
};

function toDateKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function getWeekdayLabelClassName(dayIndex: number) {
  if (dayIndex === 0) return 'text-red-500';
  if (dayIndex === 6) return 'text-blue-500';
  return 'text-gray-500';
}

/* -------------------------------------------------------------------------------------------------
 * MealDateStrip
 * -----------------------------------------------------------------------------------------------*/

interface MealDateStripProps {
  householdId: string;
  selectedDate: Date;
  onSelectedDateChange: (date: Date) => void;
}

export function MealDateStrip({
  householdId,
  selectedDate,
  onSelectedDateChange,
}: MealDateStripProps) {
  const shouldReduceMotion = useReducedMotion();

  const [weekStart, setWeekStart] = useState(() => startOfWeek(selectedDate, WEEK_OPTIONS));
  const [direction, setDirection] = useState(0);

  const selectedKey = toDateKey(selectedDate);

  // 외부에서 선택 날짜가 바뀌면(오늘 버튼, 캘린더 점프) 해당 주로 스트립을 스냅한다
  const [syncedSelectedKey, setSyncedSelectedKey] = useState(selectedKey);
  if (selectedKey !== syncedSelectedKey) {
    setSyncedSelectedKey(selectedKey);
    const nextWeekStart = startOfWeek(selectedDate, WEEK_OPTIONS);
    if (!isSameDay(nextWeekStart, weekStart)) {
      setDirection(nextWeekStart > weekStart ? 1 : -1);
      setWeekStart(nextWeekStart);
    }
  }

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const { data: summaries = [] } = useMealSummaryByRangeQuery(
    householdId,
    toDateKey(weekStart),
    toDateKey(addDays(weekStart, 6)),
  );
  const mealDateSet = useMemo(() => new Set(summaries.map((summary) => summary.date)), [summaries]);

  function moveWeek(delta: 1 | -1) {
    setDirection(delta);
    setWeekStart((current) => addWeeks(current, delta));
  }

  function settleWeekDrag(_event: unknown, info: PanInfo) {
    const { offset, velocity } = info;
    if (offset.x < -SWIPE_DISTANCE_THRESHOLD || velocity.x < -SWIPE_VELOCITY_THRESHOLD) {
      moveWeek(1);
      return;
    }
    if (offset.x > SWIPE_DISTANCE_THRESHOLD || velocity.x > SWIPE_VELOCITY_THRESHOLD) {
      moveWeek(-1);
    }
  }

  function moveToToday() {
    onSelectedDateChange(new Date());
  }

  function openCalendarSheet() {
    overlay.open(({ isOpen, close, unmount }) => {
      function closeSheet() {
        close();
        window.setTimeout(unmount, 200);
      }

      function selectCalendarDate(date?: Date) {
        if (!date) return;
        onSelectedDateChange(date);
      }

      return (
        <MealCalendarBottomSheet
          open={isOpen}
          onClose={closeSheet}
          value={selectedDate}
          onValueChange={selectCalendarDate}
        />
      );
    });
  }

  return (
    <section data-slot="meal-date-strip" className="flex flex-col gap-3">
      <div className="flex h-9 items-center justify-between">
        <button
          type="button"
          onClick={openCalendarSheet}
          aria-haspopup="dialog"
          aria-label="캘린더에서 날짜 이동"
          className="flex items-center gap-1 text-base font-bold text-gray-900 transition-opacity active:opacity-70"
        >
          {format(selectedDate, 'M월 d일 EEEE', { locale: ko })}
          <ChevronDown className="size-4 text-gray-400" aria-hidden />
        </button>
        <AnimatePresence initial={false}>
          {!isToday(selectedDate) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
            >
              <Button variant="outline" size="sm" onClick={moveToToday}>
                오늘
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="overflow-hidden" role="group" aria-label="주간 날짜 선택">
        <AnimatePresence
          initial={false}
          mode="popLayout"
          custom={shouldReduceMotion ? 0 : direction}
        >
          <motion.div
            key={toDateKey(weekStart)}
            custom={shouldReduceMotion ? 0 : direction}
            variants={weekSlideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={settleWeekDrag}
            className="grid touch-pan-y grid-cols-7"
          >
            {weekDays.map((day, dayIndex) => {
              const dayKey = toDateKey(day);
              const isSelected = dayKey === selectedKey;
              const isTodayDate = isToday(day);
              const hasMeal = mealDateSet.has(dayKey);

              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => onSelectedDateChange(day)}
                  aria-pressed={isSelected}
                  aria-current={isTodayDate ? 'date' : undefined}
                  aria-label={format(day, 'M월 d일 EEEE', { locale: ko })}
                  className="flex flex-col items-center gap-1 py-1"
                >
                  <span
                    className={cn(
                      'text-[11px] font-medium',
                      isTodayDate
                        ? 'font-semibold text-emerald-600'
                        : getWeekdayLabelClassName(dayIndex),
                    )}
                  >
                    {isTodayDate ? '오늘' : format(day, 'EEEEE', { locale: ko })}
                  </span>
                  <span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                      isSelected && 'bg-gray-900 text-white',
                      !isSelected && isTodayDate && 'bg-emerald-50 text-emerald-600',
                      !isSelected && !isTodayDate && 'text-gray-700 active:bg-gray-100',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  <span
                    className={cn(
                      'size-1 rounded-full transition-colors',
                      hasMeal ? 'bg-emerald-500' : 'bg-transparent',
                    )}
                    aria-hidden
                  />
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
