'use client';

import * as React from 'react';

import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { type Matcher } from 'react-day-picker';
import { useControlledState } from 'react-simplikit';

import { cn } from '../lib';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Calendar } from './Calendar';

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
  const [floatingContainer, setFloatingContainer] = React.useState<HTMLDivElement | null>(null);

  const [selectedDate, setSelectedDate] = useControlledState<Date | undefined>({
    value,
    defaultValue: undefined,
    onChange,
  });
  const [draftDate, setDraftDate] = React.useState<Date | undefined>(selectedDate);

  React.useEffect(() => {
    if (open) {
      setDraftDate(selectedDate);
    }
  }, [open, selectedDate]);

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

  const handleSelect = (date?: Date) => {
    setDraftDate(date);
  };

  const handleConfirm = () => {
    setSelectedDate(draftDate);
    setOpen(false);
  };

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

      <BottomSheet open={open} onClose={() => setOpen(false)}>
        <BottomSheet.Header heading="날짜 선택" />
        <BottomSheet.Content id={sheetContentId} contentClassName="space-y-4">
          <div ref={setFloatingContainer}>
            <Calendar
              mode="single"
              selected={draftDate}
              onSelect={handleSelect}
              disabled={mergedDisabled}
              floatingContainer={floatingContainer}
            />
          </div>
          <Button onClick={handleConfirm} className="w-full">
            확인
          </Button>
        </BottomSheet.Content>
      </BottomSheet>
    </div>
  );
}

DatePicker.displayName = 'DatePicker';

export { DatePicker, type DatePickerProps };
