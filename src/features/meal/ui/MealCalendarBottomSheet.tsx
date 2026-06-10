'use client';

import { useMemo, useState } from 'react';

import { addMonths, getMonth, getYear, setMonth, setYear, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { BottomSheet, Button, Calendar, Select } from '@/commons/ui';

/* -------------------------------------------------------------------------------------------------
 * Constants
 * -----------------------------------------------------------------------------------------------*/

const MIN_YEAR = 1970;

/* -------------------------------------------------------------------------------------------------
 * MealCalendarBottomSheet
 * -----------------------------------------------------------------------------------------------*/

interface MealCalendarBottomSheetProps {
  open: boolean;
  onClose: () => void;
  value: Date;
  /** 확인 버튼으로 날짜를 확정했을 때 호출 */
  onValueChange: (date: Date) => void;
}

/** 식단 날짜 이동용 캘린더 시트 — DatePicker 시트와 동일한 연/월 Select + 월 이동 버튼 구조 */
export function MealCalendarBottomSheet({
  open,
  onClose,
  value,
  onValueChange,
}: MealCalendarBottomSheetProps) {
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(value));
  const [draftDate, setDraftDate] = useState<Date | undefined>(value);

  const maxYear = getYear(new Date()) + 50;
  const minMonth = useMemo(() => startOfMonth(new Date(MIN_YEAR, 0)), []);
  const maxMonth = useMemo(() => startOfMonth(new Date(maxYear, 11)), [maxYear]);

  const yearOptions = useMemo(
    () => Array.from({ length: maxYear - MIN_YEAR + 1 }, (_, index) => maxYear - index),
    [maxYear],
  );
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, index) => index + 1), []);

  const canGoPrevMonth = displayMonth.getTime() > minMonth.getTime();
  const canGoNextMonth = displayMonth.getTime() < maxMonth.getTime();

  function selectDate(date?: Date) {
    setDraftDate(date);
  }

  function confirmDate() {
    if (draftDate) onValueChange(draftDate);
    onClose();
  }

  function changeMonth(month?: Date) {
    if (!month) return;
    setDisplayMonth(startOfMonth(month));
  }

  function moveToPreviousMonth() {
    if (!canGoPrevMonth) return;
    setDisplayMonth((currentMonth) => startOfMonth(addMonths(currentMonth, -1)));
  }

  function moveToNextMonth() {
    if (!canGoNextMonth) return;
    setDisplayMonth((currentMonth) => startOfMonth(addMonths(currentMonth, 1)));
  }

  function changeYear(yearValue: string) {
    const nextYear = Number(yearValue);
    if (Number.isNaN(nextYear)) return;
    setDisplayMonth((currentMonth) => startOfMonth(setYear(currentMonth, nextYear)));
  }

  function changeMonthFromSelect(monthValue: string) {
    const nextMonth = Number(monthValue) - 1;
    if (Number.isNaN(nextMonth)) return;
    setDisplayMonth((currentMonth) => startOfMonth(setMonth(currentMonth, nextMonth)));
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheet.Header heading="날짜 이동" />
      <BottomSheet.Content className="flex flex-col items-center space-y-4">
        <div className="w-full max-w-[320px] space-y-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={moveToPreviousMonth}
              disabled={!canGoPrevMonth}
              aria-label="이전 달"
            >
              <ChevronLeft className="size-5" />
            </Button>
            <div className="grid flex-1 grid-cols-2 gap-2">
              <Select value={String(getYear(displayMonth))} onValueChange={changeYear}>
                <Select.Trigger className="h-10 justify-center text-sm [&>span]:w-full [&>span]:text-center">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {yearOptions.map((year) => (
                    <Select.Item key={year} value={String(year)}>
                      {year}년
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
              <Select
                value={String(getMonth(displayMonth) + 1)}
                onValueChange={changeMonthFromSelect}
              >
                <Select.Trigger className="h-10 justify-center text-sm [&>span]:w-full [&>span]:text-center">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {monthOptions.map((month) => (
                    <Select.Item key={month} value={String(month)}>
                      {month}월
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={moveToNextMonth}
              disabled={!canGoNextMonth}
              aria-label="다음 달"
            >
              <ChevronRight className="size-5" />
            </Button>
          </div>

          <Calendar
            mode="single"
            month={displayMonth}
            onMonthChange={changeMonth}
            selected={draftDate}
            onSelect={selectDate}
            hideNavigation
            hideMonthCaption
            className="mx-auto w-full border-none bg-transparent p-0 shadow-none"
          />
        </div>
        <div className="w-full max-w-[320px]">
          <Button type="button" onClick={confirmDate} className="w-full">
            확인
          </Button>
        </div>
      </BottomSheet.Content>
    </BottomSheet>
  );
}
