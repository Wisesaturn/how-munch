'use client';

import * as React from 'react';

import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, getDefaultClassNames, type DayPickerProps } from 'react-day-picker';

import { cn } from '../lib';

/* -------------------------------------------------------------------------------------------------
 * Calendar
 * -----------------------------------------------------------------------------------------------*/
function Calendar({
  hideMonthCaption = false,
  className,
  classNames,
  modifiers,
  modifiersClassNames,
  showOutsideDays = true,
  ...props
}: DayPickerProps & { hideMonthCaption?: boolean }) {
  const defaultClassNames = getDefaultClassNames();
  const todayYear = new Date().getFullYear();

  return (
    <DayPicker
      locale={ko}
      showOutsideDays={showOutsideDays}
      captionLayout="label"
      startMonth={new Date(1970, 0)}
      endMonth={new Date(todayYear + 50, 11)}
      modifiers={{
        sunday: (date) => date.getDay() === 0,
        saturday: (date) => date.getDay() === 6,
        ...modifiers,
      }}
      className={cn('rounded-2xl border border-gray-200 bg-white p-3', className)}
      classNames={{
        root: cn(defaultClassNames.root, 'w-full'),
        months: cn(defaultClassNames.months, 'w-full'),
        month: cn(defaultClassNames.month, 'w-full space-y-2'),
        month_caption: cn(
          defaultClassNames.month_caption,
          'relative h-9 items-center justify-center flex',
          hideMonthCaption && 'hidden',
        ),
        caption_label: cn(
          defaultClassNames.caption_label,
          'text-sm font-semibold text-gray-900',
          hideMonthCaption && 'hidden',
        ),
        nav: cn(
          defaultClassNames.nav,
          'absolute inset-x-0 top-0 flex items-center justify-between',
        ),
        button_previous: cn(
          defaultClassNames.button_previous,
          'size-8 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40',
        ),
        button_next: cn(
          defaultClassNames.button_next,
          'size-8 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40',
        ),
        weekdays: cn(defaultClassNames.weekdays, hideMonthCaption ? 'mt-0 flex' : 'mt-2 flex'),
        weekday: cn(
          defaultClassNames.weekday,
          'm-0.5 size-10 text-center text-xs font-medium text-gray-500 first:text-red-500 last:text-blue-500',
        ),
        week: cn(defaultClassNames.week, 'flex'),
        day: cn(defaultClassNames.day, 'm-0.5 size-10 p-0'),
        day_button: cn(
          defaultClassNames.day_button,
          'size-10 rounded-lg border-0 text-sm font-medium text-inherit transition-colors',
          'hover:bg-gray-100',
          'aria-selected:bg-gray-900 aria-selected:text-white aria-selected:hover:bg-gray-900',
          '[&[data-selected=true]]:bg-gray-900 [&[data-selected=true]]:text-white [&[data-selected=true]]:hover:bg-gray-900',
          'focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:outline-none',
        ),
        outside: cn(defaultClassNames.outside, 'text-gray-300'),
        today: cn(
          defaultClassNames.today,
          'bg-transparent [&>button]:bg-gray-100 [&>button]:text-gray-900',
        ),
        selected: cn(
          defaultClassNames.selected,
          'bg-transparent [&>button]:rounded-lg [&>button]:bg-gray-900 [&>button]:text-white',
        ),
        disabled: cn(defaultClassNames.disabled, 'cursor-not-allowed text-gray-300'),
        ...classNames,
      }}
      modifiersClassNames={{
        sunday: 'text-red-600',
        saturday: 'text-blue-600',
        ...modifiersClassNames,
      }}
      components={{
        Chevron: ({ orientation, className: iconClassName, ...rest }) => {
          if (orientation === 'left') {
            return <ChevronLeft className={cn('size-4', iconClassName)} {...rest} />;
          }
          return <ChevronRight className={cn('size-4', iconClassName)} {...rest} />;
        },
      }}
      {...props}
    />
  );
}

Calendar.displayName = 'Calendar';

export { Calendar };
