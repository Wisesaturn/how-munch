'use client';

import * as React from 'react';

import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { type Matcher } from 'react-day-picker';

import { cn } from '../lib';

import { Button } from './Button';
import { Calendar } from './Calendar';
import { Popover } from './Popover';

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
  const [open, setOpen] = React.useState(false);
  const [boundaryElement, setBoundaryElement] = React.useState<HTMLDivElement | null>(null);

  const [internalDate, setInternalDate] = React.useState<Date | undefined>(value);
  const isControlled = value !== undefined;
  const selectedDate = isControlled ? value : internalDate;

  React.useEffect(() => {
    if (isControlled) {
      setInternalDate(value);
    }
  }, [isControlled, value]);

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
    if (!isControlled) setInternalDate(date);
    onChange?.(date);
    setOpen(false);
  };

  return (
    <div ref={setBoundaryElement} className={cn('relative w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <Button
            type="button"
            variant="outline"
            color="mono"
            className={cn(
              'w-full justify-between border-gray-300 text-left font-normal text-gray-900',
              !selectedDate && 'text-gray-400',
              triggerClassName,
            )}
            disabled={disabled}
          >
            {selectedDate ? format(selectedDate, 'yyyy-MM-dd') : placeholder}
            <CalendarIcon className="size-4 text-gray-500" />
          </Button>
        </Popover.Trigger>
        <Popover.Content
          align="start"
          side="bottom"
          sideOffset={8}
          collisionBoundary={boundaryElement ?? undefined}
          container={boundaryElement}
          className="w-auto border-none bg-transparent p-0 shadow-none"
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={mergedDisabled}
          />
        </Popover.Content>
      </Popover>
    </div>
  );
}

DatePicker.displayName = 'DatePicker';

export { DatePicker, type DatePickerProps };
