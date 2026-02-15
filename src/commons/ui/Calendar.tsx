'use client';

import * as React from 'react';

import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, getDefaultClassNames, type DayPickerProps } from 'react-day-picker';

import { cn } from '../lib';

import { Select } from './Select';

/* -------------------------------------------------------------------------------------------------
 * Calendar Dropdown
 * -----------------------------------------------------------------------------------------------*/
interface CalendarDropdownOption {
  value: number;
  label: string;
  disabled: boolean;
}

type CalendarDropdownProps = React.ComponentProps<'select'> & {
  options?: CalendarDropdownOption[];
  floatingContainer?: HTMLElement | null;
};

function CalendarDropdown({
  options = [],
  value,
  onChange,
  disabled,
  'aria-label': ariaLabel,
  floatingContainer = null,
}: CalendarDropdownProps) {
  const safeValue =
    value !== undefined && value !== null ? String(value) : String(options[0]?.value ?? '');

  return (
    <Select
      value={safeValue}
      onValueChange={(nextValue) => {
        if (!onChange) return;

        onChange({
          target: { value: nextValue },
          currentTarget: { value: nextValue },
        } as React.ChangeEvent<HTMLSelectElement>);
      }}
      disabled={disabled}
    >
      <Select.Trigger aria-label={ariaLabel} className="h-8 w-auto min-w-[72px] px-2 pr-7 text-xs">
        <Select.Value />
      </Select.Trigger>
      <Select.Content
        // HACK: DatePicker/Sheet 내부에서 헤더 Select가 body 기준으로 떠서 잘리거나
        // 포커스/외부클릭 판정이 깨지는 문제를 방지하기 위해 같은 경계에서 렌더링합니다.
        container={floatingContainer}
        collisionBoundary={floatingContainer ?? undefined}
      >
        {options.map((option) => (
          <Select.Item
            key={`${ariaLabel}-${option.value}`}
            value={String(option.value)}
            disabled={option.disabled}
          >
            {option.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Calendar
 * -----------------------------------------------------------------------------------------------*/
function Calendar({
  floatingContainer = null,
  className,
  classNames,
  modifiers,
  modifiersClassNames,
  showOutsideDays = true,
  ...props
}: DayPickerProps & { floatingContainer?: HTMLElement | null }) {
  const defaultClassNames = getDefaultClassNames();
  const todayYear = new Date().getFullYear();

  return (
    <DayPicker
      locale={ko}
      showOutsideDays={showOutsideDays}
      captionLayout="dropdown"
      startMonth={new Date(1970, 0)}
      endMonth={new Date(todayYear + 50, 11)}
      modifiers={{
        sunday: (date) => date.getDay() === 0,
        saturday: (date) => date.getDay() === 6,
        ...modifiers,
      }}
      className={cn('rounded-xl border border-gray-200 bg-white p-2.5', className)}
      classNames={{
        root: cn(defaultClassNames.root, 'w-fit'),
        months: cn(defaultClassNames.months, 'flex'),
        month: cn(defaultClassNames.month, 'space-y-2'),
        month_caption: cn(defaultClassNames.month_caption, 'h-9 items-center justify-center gap-2'),
        caption_label: cn(defaultClassNames.caption_label, 'text-sm font-semibold text-gray-900'),
        dropdowns: cn(defaultClassNames.dropdowns, 'flex items-center gap-2'),
        dropdown_root: cn(defaultClassNames.dropdown_root, 'relative'),
        dropdown: cn(
          defaultClassNames.dropdown,
          'h-8 rounded-md border border-gray-200 bg-white px-2 pr-7 text-xs font-medium text-gray-700 outline-none',
        ),
        months_dropdown: cn(defaultClassNames.months_dropdown, 'min-w-[72px]'),
        years_dropdown: cn(defaultClassNames.years_dropdown, 'min-w-[84px]'),
        nav: cn(defaultClassNames.nav, 'flex items-center gap-1'),
        button_previous: cn(
          defaultClassNames.button_previous,
          'size-7 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
        ),
        button_next: cn(
          defaultClassNames.button_next,
          'size-7 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
        ),
        weekdays: cn(defaultClassNames.weekdays, 'mt-1 flex'),
        weekday: cn(
          defaultClassNames.weekday,
          'm-0.5 size-[34px] text-center text-xs font-medium text-gray-700 first:text-red-600 last:text-blue-600',
        ),
        week: cn(defaultClassNames.week, 'flex'),
        day: cn(defaultClassNames.day, 'm-0.5 size-[34px] p-0'),
        day_button: cn(
          defaultClassNames.day_button,
          'size-[34px] rounded-sm border-0 text-sm font-medium text-inherit transition-colors',
          'hover:bg-gray-100',
          'aria-selected:bg-emerald-700 aria-selected:text-white aria-selected:hover:bg-emerald-700',
          '[&[data-selected=true]]:bg-emerald-700 [&[data-selected=true]]:text-white [&[data-selected=true]]:hover:bg-emerald-700',
          'focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none',
        ),
        outside: cn(defaultClassNames.outside, 'text-gray-300'),
        today: cn(defaultClassNames.today, 'bg-emerald-50 text-emerald-700'),
        selected: cn(defaultClassNames.selected, 'bg-emerald-700 text-white'),
        disabled: cn(defaultClassNames.disabled, 'cursor-not-allowed text-gray-300 line-through'),
        ...classNames,
      }}
      modifiersClassNames={{
        sunday: 'text-red-600',
        saturday: 'text-blue-600',
        ...modifiersClassNames,
      }}
      components={{
        Dropdown: (dropdownProps) => (
          <CalendarDropdown {...dropdownProps} floatingContainer={floatingContainer} />
        ),
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
