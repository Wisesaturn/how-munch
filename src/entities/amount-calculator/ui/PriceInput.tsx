'use client';

import { type ComponentProps } from 'react';

import { Calculator } from 'lucide-react';

import { cn } from '@/commons/lib';

import { useAmountCalculatorOpener } from '../model/amountCalculatorOpener';

interface PriceInputBaseProps extends Omit<
  ComponentProps<'button'>,
  'value' | 'type' | 'onClick' | 'children' | 'title'
> {
  /** 계산기 화면 제목 */
  title?: string;
  invalid?: boolean;
}

interface RequiredPriceInputProps extends PriceInputBaseProps {
  nullable?: false;
  value: number;
  onValueChange: (value: number) => void;
}

interface NullablePriceInputProps extends PriceInputBaseProps {
  /** 빈칸(미설정)과 0을 구분해야 할 때 사용한다 */
  nullable: true;
  value: number | null;
  onValueChange: (value: number | null) => void;
}

export type PriceInputProps = RequiredPriceInputProps | NullablePriceInputProps;

/** 금액 칸 — 누르면 계산기 화면을 열고, 확인한 금액을 값으로 받는다 */
export function PriceInput(props: PriceInputProps) {
  const {
    title = '금액 입력',
    value,
    nullable = false,
    onValueChange: _onValueChange,
    invalid,
    className,
    ...buttonProps
  } = props;
  const { openAmountCalculator } = useAmountCalculatorOpener('PriceInput');

  function applyConfirmedValue(next: number | null) {
    if (props.nullable === true) {
      props.onValueChange(next);
      return;
    }
    if (next !== null) props.onValueChange(next);
  }

  const amountText = value === null ? '미설정' : `${value.toLocaleString('ko-KR')}원`;

  return (
    <button
      type="button"
      data-slot="price-input"
      aria-label={`${title}, 현재 ${amountText}, 계산기 열기`}
      data-invalid={invalid}
      className={cn(
        'flex h-10 w-full min-w-0 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-left text-sm shadow-xs',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
        'data-[invalid=true]:border-red-500',
        'disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400',
        className,
      )}
      onClick={() =>
        openAmountCalculator({ title, value, nullable, onConfirm: applyConfirmedValue })
      }
      {...buttonProps}
    >
      <span
        className={cn('min-w-0 flex-1 truncate tabular-nums', value === null && 'text-gray-400')}
      >
        {value === null ? '미설정' : value.toLocaleString('ko-KR')}
      </span>
      {value === null ? null : <span className="font-medium text-gray-500">원</span>}
      <Calculator className="size-4 shrink-0 text-gray-400" aria-hidden />
    </button>
  );
}
