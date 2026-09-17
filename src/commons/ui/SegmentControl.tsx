'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';
import { motion, useReducedMotion } from 'framer-motion';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import { useControlledState } from 'react-simplikit';

import { cn } from '../lib';
import { createSafeContext } from '../lib/context';

/* -------------------------------------------------------------------------------------------------
 * Context
 *
 * radix ToggleGroup(single) 기반 세그먼트 컨트롤. 값 하나만 선택되는 뷰 전환용 컨트롤이다.
 * 선택 표시는 항목별 배경이 아니라 단 하나의 pill(motion layoutId)이라, 선택이 바뀌면 항목 사이를
 * 매끄럽게 미끄러지며 이동한다. 자식을 훑어 인덱스를 세거나 CSS calc()로 위치를 계산하지 않으므로
 * Fragment·조건부 렌더링이 끼어도 어긋나지 않는다.
 * -----------------------------------------------------------------------------------------------*/

type SegmentControlSize = 'sm' | 'md' | 'lg';

interface SegmentControlContextValue {
  value: string;
  disabled: boolean;
  size: SegmentControlSize;
  /** pill의 layoutId — 한 페이지에 여러 컨트롤이 있어도 서로 간섭하지 않도록 인스턴스별로 분리 */
  pillLayoutId: string;
}

const [SegmentControlProvider, useSegmentControl] =
  createSafeContext<SegmentControlContextValue>('SegmentControl');

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

const segmentControlVariants = cva(
  // items-stretch — 항목이 콘텐츠 높이로 줄면 pill(absolute inset-0)도 같이 작아져
  // 트랙 안에서 떠 보인다. 항목이 트랙 높이(패딩 제외)를 꽉 채워야 pill이 영역에 맞는다.
  'relative inline-flex w-full items-stretch rounded-full shadow-[0_4px_16px_-10px_rgba(6,95,70,0.4)] select-none',
  {
    variants: {
      size: {
        sm: 'h-8 gap-0.5 p-0.5',
        md: 'h-10 gap-1 p-1',
        lg: 'h-12 gap-1 p-1',
      },
      disabled: {
        true: 'bg-gray-100 shadow-none',
        false: 'bg-gray-100',
      },
    },
    defaultVariants: { size: 'md', disabled: false },
  },
);

interface SegmentControlRootProps
  extends
    Omit<
      ComponentProps<typeof ToggleGroupPrimitive.Root>,
      'type' | 'value' | 'defaultValue' | 'onValueChange' | 'disabled'
    >,
    Omit<VariantProps<typeof segmentControlVariants>, 'disabled'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}

function SegmentControlRoot({
  value: valueProp,
  defaultValue = '',
  onValueChange,
  disabled = false,
  size = 'md',
  className,
  children,
  ...props
}: SegmentControlRootProps) {
  const [value, setValue] = useControlledState({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });

  const resolvedSize = size ?? 'md';
  const pillLayoutId = useId();

  return (
    <SegmentControlProvider
      value={value}
      disabled={disabled}
      size={resolvedSize}
      pillLayoutId={pillLayoutId}
    >
      <ToggleGroupPrimitive.Root
        type="single"
        value={value}
        // 활성 항목을 다시 누르면 radix가 빈 값을 넘긴다. 이를 무시해
        // "항상 하나는 선택"이라는 불변식을 컴포넌트가 보장한다.
        onValueChange={(next) => {
          if (next) setValue(next);
        }}
        disabled={disabled}
        data-slot="segment-control"
        aria-disabled={disabled}
        className={cn(segmentControlVariants({ size: resolvedSize, disabled }), className)}
        {...props}
      >
        {children}
      </ToggleGroupPrimitive.Root>
    </SegmentControlProvider>
  );
}

SegmentControlRoot.displayName = 'SegmentControl';

/* -------------------------------------------------------------------------------------------------
 * Item
 * -----------------------------------------------------------------------------------------------*/

const segmentControlItemVariants = cva(
  [
    'relative inline-flex flex-1 cursor-pointer items-center justify-center rounded-full font-medium transition-colors',
    'focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:outline-none',
    'data-[disabled]:cursor-not-allowed',
  ],
  {
    variants: {
      size: {
        sm: 'px-2 text-xs',
        md: 'px-3.5 text-sm',
        lg: 'px-4 text-base',
      },
      selected: {
        true: 'text-white',
        false: 'text-gray-500 hover:text-gray-700',
      },
      disabled: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      { disabled: true, selected: true, className: 'text-gray-500' },
      { disabled: true, selected: false, className: 'text-gray-400 hover:text-gray-400' },
    ],
    defaultVariants: { size: 'md', selected: false, disabled: false },
  },
);

interface SegmentControlItemProps extends Omit<
  ComponentProps<typeof ToggleGroupPrimitive.Item>,
  'onChange'
> {
  value: string;
  /** 라벨 앞에 붙는 아이콘 (lucide 등) */
  icon?: ReactNode;
  children: ReactNode;
}

function SegmentControlItem({
  value,
  icon,
  disabled: itemDisabled,
  className,
  children,
  ...props
}: SegmentControlItemProps) {
  const { value: selectedValue, disabled: rootDisabled, size, pillLayoutId } = useSegmentControl();
  const shouldReduceMotion = useReducedMotion();

  const selected = value === selectedValue;
  const disabled = rootDisabled || (itemDisabled ?? false);

  return (
    <ToggleGroupPrimitive.Item
      value={value}
      disabled={disabled}
      data-slot="segment-control-item"
      data-selected={selected}
      className={cn(segmentControlItemVariants({ size, selected, disabled }), className)}
      {...props}
    >
      {selected ? (
        <motion.span
          aria-hidden
          layoutId={pillLayoutId}
          data-slot="segment-control-indicator"
          className={cn(
            'absolute inset-0 -z-0 rounded-full',
            disabled ? 'bg-gray-300' : 'bg-emerald-600 shadow-[0_4px_12px_-4px_rgba(6,95,70,0.5)]',
          )}
          transition={
            shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }
          }
        />
      ) : null}
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {icon}
        {children}
      </span>
    </ToggleGroupPrimitive.Item>
  );
}

SegmentControlItem.displayName = 'SegmentControl.Item';

/* -------------------------------------------------------------------------------------------------
 * Export
 * -----------------------------------------------------------------------------------------------*/

const SegmentControl = Object.assign(SegmentControlRoot, {
  Root: SegmentControlRoot,
  Item: SegmentControlItem,
});

export { SegmentControl };
