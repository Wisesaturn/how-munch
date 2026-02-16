'use client';

import * as React from 'react';

import { addMonths, format, getMonth, getYear, setMonth, setYear, startOfMonth } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { type Matcher } from 'react-day-picker';
import { useControlledState } from 'react-simplikit';

import { cn } from '../lib';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Calendar } from './Calendar';
import { Select } from './Select';

/* -------------------------------------------------------------------------------------------------
 * DatePicker
 * -----------------------------------------------------------------------------------------------*/
interface DatePickerProps {
  value?: Date;
  onChange?: (date?: Date) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Matcher | Matcher[];
  className?: string;
  triggerClassName?: string;
}

function DatePicker({
  value,
  onChange,
  placeholder = '날짜를 선택하세요',
  disabled = false,
  minDate,
  maxDate,
  disabledDates,
  className,
  triggerClassName,
}: DatePickerProps) {
  const sheetContentId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [displayMonth, setDisplayMonth] = React.useState(startOfMonth(new Date()));

  const [selectedDate, setSelectedDate] = useControlledState<Date | undefined>({
    value,
    defaultValue: undefined,
    onChange,
  });
  const [draftDate, setDraftDate] = React.useState<Date | undefined>(selectedDate);

  const minMonth = React.useMemo(
    () => (minDate ? startOfMonth(minDate) : startOfMonth(new Date(1970, 0))),
    [minDate],
  );
  const maxMonth = React.useMemo(
    () =>
      maxDate ? startOfMonth(maxDate) : startOfMonth(new Date(new Date().getFullYear() + 50, 11)),
    [maxDate],
  );

  const clampMonth = React.useCallback(
    (month: Date) => {
      const normalizedMonth = startOfMonth(month);
      if (normalizedMonth < minMonth) return minMonth;
      if (normalizedMonth > maxMonth) return maxMonth;
      return normalizedMonth;
    },
    [minMonth, maxMonth],
  );

  React.useEffect(
    function syncDraftDateWhenSheetOpens() {
      if (!open) return;

      setDraftDate(selectedDate);
      const fallbackDate = selectedDate ?? new Date();
      setDisplayMonth(clampMonth(fallbackDate));
    },
    [open, selectedDate, clampMonth],
  );

  const baseDisabled: Matcher[] = React.useMemo(() => {
    if (!disabledDates) return [];
    return Array.isArray(disabledDates) ? disabledDates : [disabledDates];
  }, [disabledDates]);

  const mergedDisabled = React.useMemo<Matcher[]>(
    () => [
      ...baseDisabled,
      ...(minDate ? [{ before: minDate }] : []),
      ...(maxDate ? [{ after: maxDate }] : []),
    ],
    [baseDisabled, minDate, maxDate],
  );

  const yearOptions = React.useMemo(() => {
    const startYear = getYear(minMonth);
    const endYear = getYear(maxMonth);
    return Array.from({ length: endYear - startYear + 1 }, (_, index) => endYear - index);
  }, [minMonth, maxMonth]);

  const monthOptions = React.useMemo(() => {
    const currentYear = getYear(displayMonth);
    return Array.from({ length: 12 }, (_, index) => index + 1).map((monthNumber) => {
      const monthDate = new Date(currentYear, monthNumber - 1, 1);
      const clampedMonthDate = clampMonth(monthDate);
      return {
        value: monthNumber,
        disabled: clampedMonthDate.getTime() !== startOfMonth(monthDate).getTime(),
      };
    });
  }, [displayMonth, clampMonth]);

  const canGoPrevMonth = displayMonth.getTime() > minMonth.getTime();
  const canGoNextMonth = displayMonth.getTime() < maxMonth.getTime();

  function selectDate(date?: Date) {
    setDraftDate(date);
  }

  function confirmDate() {
    setSelectedDate(draftDate);
    setOpen(false);
  }

  function closeDatePicker() {
    setOpen(false);
  }

  function changeMonth(month?: Date) {
    if (!month) return;
    setDisplayMonth(clampMonth(month));
  }

  function moveToPreviousMonth() {
    if (!canGoPrevMonth) return;
    setDisplayMonth((currentMonth) => clampMonth(addMonths(currentMonth, -1)));
  }

  function moveToNextMonth() {
    if (!canGoNextMonth) return;
    setDisplayMonth((currentMonth) => clampMonth(addMonths(currentMonth, 1)));
  }

  function changeYear(value: string) {
    const nextYear = Number(value);
    if (Number.isNaN(nextYear)) return;
    setDisplayMonth((currentMonth) => clampMonth(setYear(currentMonth, nextYear)));
  }

  function changeMonthFromSelect(value: string) {
    const nextMonth = Number(value) - 1;
    if (Number.isNaN(nextMonth)) return;
    setDisplayMonth((currentMonth) => clampMonth(setMonth(currentMonth, nextMonth)));
  }

  return (
    <div data-slot="date-picker" className={cn('relative w-full', className)}>
      <Button
        type="button"
        variant="outline"
        color="mono"
        data-slot="date-picker-trigger"
        aria-label="날짜 선택 열기"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={sheetContentId}
        className={cn(
          'w-full justify-between border-gray-300 text-left font-normal text-gray-900',
          !selectedDate && 'text-gray-400',
          triggerClassName,
        )}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {selectedDate ? format(selectedDate, 'yyyy-MM-dd') : placeholder}
        <CalendarIcon className="size-4 text-gray-500" />
      </Button>

      <BottomSheet open={open} onClose={closeDatePicker}>
        <BottomSheet.Header heading="날짜 선택" />
        <BottomSheet.Content
          id={sheetContentId}
          contentClassName="flex flex-col items-center space-y-4"
        >
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
                  <Select.Trigger className="h-9 justify-center text-sm [&>span]:w-full [&>span]:text-center">
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
                  <Select.Trigger className="h-9 justify-center text-sm [&>span]:w-full [&>span]:text-center">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {monthOptions.map((month) => (
                      <Select.Item
                        key={month.value}
                        value={String(month.value)}
                        disabled={month.disabled}
                      >
                        {month.value}월
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
              disabled={mergedDisabled}
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
    </div>
  );
}

DatePicker.displayName = 'DatePicker';

export { DatePicker, type DatePickerProps };
