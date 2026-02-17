import * as React from 'react';

import { useControlledState } from 'react-simplikit';
import { Minus, Plus } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib';

import { InputGroup } from './InputGroup';

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
const counterInputVariants = cva('text-center', {
  variants: {
    size: {
      sm: 'h-8',
      md: 'h-9',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

/* -------------------------------------------------------------------------------------------------
 * Props
 * -----------------------------------------------------------------------------------------------*/
interface CounterProps extends VariantProps<typeof counterInputVariants> {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  inputClassName?: string;
}

/**
 * @description step 값을 기준으로 허용할 소수점 자릿수를 계산합니다.
 */
function resolveDecimalScale(step: number) {
  if (!Number.isFinite(step) || step <= 0) return 0;
  if (Number.isInteger(step)) return 0;
  return String(step).split('.')[1]?.length ?? 0;
}

/**
 * @description 소수점 자릿수 기준으로 숫자 값을 정규화합니다.
 */
function normalizeNumberByScale(value: number, decimalScale: number) {
  if (!Number.isFinite(value)) return value;
  if (decimalScale <= 0) return Math.round(value);
  return Number(value.toFixed(decimalScale));
}

/**
 * @description 입력 필드에 표시할 숫자 문자열을 생성합니다.
 */
function formatInputValue(value: number, decimalScale: number) {
  const normalized = normalizeNumberByScale(value, decimalScale);
  if (decimalScale <= 0) return String(normalized);
  return String(normalized)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
}

/**
 * @description 부호/소수점 자리수 조건에 맞는 입력 패턴 문자열을 반환합니다.
 */
function resolveInputPattern(allowNegative: boolean, decimalScale: number) {
  if (decimalScale === 0) return allowNegative ? '-?[0-9]*' : '[0-9]*';
  return allowNegative
    ? `-?[0-9]*[.]?[0-9]{0,${decimalScale}}`
    : `[0-9]*[.]?[0-9]{0,${decimalScale}}`;
}

function clampValue(value: number, min?: number, max?: number) {
  if (Number.isNaN(value)) return min ?? 0;
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
}

/** Design-system Counter 입력 규칙을 기준으로 숫자 형식만 남깁니다. */
function sanitizeNumericText(value: string, allowNegative: boolean, decimalScale: number) {
  const trimmed = value.replace(/\s/g, '').replace(/,/g, '.');
  const withSign = allowNegative ? trimmed.replace(/(?!^-)-/g, '') : trimmed.replace(/-/g, '');
  const cleaned = withSign.replace(/[^0-9.-]/g, '');

  if (decimalScale === 0) {
    return cleaned.replace(/\./g, '');
  }

  const firstDotIndex = cleaned.indexOf('.');

  if (firstDotIndex < 0) return cleaned;

  const integerPart = cleaned.slice(0, firstDotIndex + 1);
  const decimalPart = cleaned
    .slice(firstDotIndex + 1)
    .replace(/\./g, '')
    .slice(0, decimalScale);
  return `${integerPart}${decimalPart}`;
}

function Counter({
  value,
  defaultValue = 0,
  onValueChange,
  size = 'md',
  min = 0,
  max,
  step = 1,
  disabled = false,
  invalid = false,
  className,
  inputClassName,
}: CounterProps) {
  const allowNegative = min < 0;
  const decimalScale = resolveDecimalScale(step);
  const [currentValue, setCurrentValue] = useControlledState<number>({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  const [inputValue, setInputValue] = React.useState(String(currentValue));

  React.useEffect(
    function syncInputValueFromCurrentValue() {
      setInputValue(formatInputValue(currentValue, decimalScale));
    },
    [currentValue, decimalScale],
  );

  function updateValue(nextValue: number) {
    const clampedValue = clampValue(nextValue, min, max);
    const normalizedValue = normalizeNumberByScale(clampedValue, decimalScale);
    setCurrentValue(normalizedValue);
    setInputValue(formatInputValue(normalizedValue, decimalScale));
  }

  function updateValueWithoutSyncInput(nextValue: number) {
    const clampedValue = clampValue(nextValue, min, max);
    const normalizedValue = normalizeNumberByScale(clampedValue, decimalScale);
    setCurrentValue(normalizedValue);
  }

  function decreaseValue() {
    updateValue(currentValue - step);
  }

  function increaseValue() {
    updateValue(currentValue + step);
  }

  function changeInputValue(event: React.ChangeEvent<HTMLInputElement>) {
    const sanitizedValue = sanitizeNumericText(event.target.value, allowNegative, decimalScale);
    setInputValue(sanitizedValue);

    if (
      !sanitizedValue ||
      sanitizedValue === '-' ||
      sanitizedValue === '.' ||
      sanitizedValue === '-.' ||
      sanitizedValue.endsWith('.')
    ) {
      return;
    }

    const parsedValue = Number(sanitizedValue);
    if (!Number.isFinite(parsedValue)) return;
    updateValueWithoutSyncInput(parsedValue);
  }

  function applyClampedValueOnBlur() {
    if (!inputValue || inputValue === '-' || inputValue === '.' || inputValue === '-.') {
      updateValue(min);
      return;
    }
    updateValue(Number(inputValue));
  }

  function changeValueByDirection(direction: '+' | '-') {
    if (direction === '+') {
      increaseValue();
      return;
    }
    decreaseValue();
  }

  function captureArrowKeyForStepControl(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      changeValueByDirection('+');
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      changeValueByDirection('-');
    }
    if (!allowNegative && event.key === '-') {
      event.preventDefault();
    }
    if (decimalScale === 0 && event.key === '.') {
      event.preventDefault();
    }
  }

  const minDisabled = disabled || currentValue <= min;
  const maxDisabled = disabled || (max !== undefined && currentValue >= max);

  return (
    <InputGroup data-slot="counter" className={className} aria-disabled={disabled}>
      <InputGroup.Input
        value={inputValue}
        inputMode="decimal"
        pattern={resolveInputPattern(allowNegative, decimalScale)}
        onChange={changeInputValue}
        onBlur={applyClampedValueOnBlur}
        onKeyDown={captureArrowKeyForStepControl}
        disabled={disabled}
        invalid={invalid}
        className={cn(counterInputVariants({ size }), inputClassName)}
      />
      <InputGroup.Addon align="inline-start">
        <InputGroup.Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={decreaseValue}
          disabled={minDisabled}
          aria-label="수량 감소"
        >
          <Minus className="size-3" />
        </InputGroup.Button>
      </InputGroup.Addon>
      <InputGroup.Addon align="inline-end">
        <InputGroup.Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={increaseValue}
          disabled={maxDisabled}
          aria-label="수량 증가"
        >
          <Plus className="size-3" />
        </InputGroup.Button>
      </InputGroup.Addon>
    </InputGroup>
  );
}

export { Counter, type CounterProps };
