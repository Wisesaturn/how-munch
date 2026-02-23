import * as React from 'react';

import { useControlledState } from 'react-simplikit';
import { Minus, Plus } from 'lucide-react';
import { clamp } from 'es-toolkit';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn, parseSafeNumericInput } from '../lib';

import { InputGroup } from './InputGroup';

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
const counterRootVariants = cva('', {
  variants: {
    size: {
      sm: 'h-9',
      md: 'h-10',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

/* -------------------------------------------------------------------------------------------------
 * Props
 * -----------------------------------------------------------------------------------------------*/
interface CounterProps extends VariantProps<typeof counterRootVariants> {
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
 * @description 부호/소수점 자리수 조건에 맞는 입력 패턴 문자열을 반환합니다.
 */
function resolveNumericInputPattern(allowNegative: boolean, decimalScale: number) {
  if (decimalScale === 0) return allowNegative ? '-?[0-9]*' : '[0-9]*';
  return allowNegative
    ? `-?[0-9]*[.]?[0-9]{0,${decimalScale}}`
    : `[0-9]*[.]?[0-9]{0,${decimalScale}}`;
}

/**
 * @description 소수점 자릿수 기준으로 숫자 값을 정규화합니다.
 */
function normalizeNumberByScale(value: number, decimalScale: number) {
  if (!Number.isFinite(value)) return value;
  if (decimalScale <= 0) return Math.round(value);
  return Number(value.toFixed(decimalScale));
}

function Counter({
  value,
  defaultValue = 0,
  size = 'md',
  onValueChange,
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
  const [inputValue, setInputValue] = React.useState(
    parseSafeNumericInput(currentValue, { decimalScale, allowNegative }).text,
  );

  React.useEffect(
    function syncInputValueFromCurrentValue() {
      setInputValue(parseSafeNumericInput(currentValue, { decimalScale, allowNegative }).text);
    },
    [currentValue, decimalScale, allowNegative],
  );

  function updateValue(nextValue: number) {
    const safeValue = Number.isNaN(nextValue) ? min : nextValue;
    const clampedValue = max === undefined ? Math.max(min, safeValue) : clamp(safeValue, min, max);
    const normalizedValue = normalizeNumberByScale(clampedValue, decimalScale);
    setCurrentValue(normalizedValue);
    setInputValue(parseSafeNumericInput(normalizedValue, { decimalScale, allowNegative }).text);
  }

  function updateValueWithoutSyncInput(nextValue: number) {
    const safeValue = Number.isNaN(nextValue) ? min : nextValue;
    const clampedValue = max === undefined ? Math.max(min, safeValue) : clamp(safeValue, min, max);
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
    const parsedInput = parseSafeNumericInput(event.target.value, {
      decimalScale,
      allowNegative,
    });
    setInputValue(parsedInput.text);

    if (parsedInput.value === null) return;
    updateValueWithoutSyncInput(parsedInput.value);
  }

  function applyClampedValueOnBlur() {
    const parsedInput = parseSafeNumericInput(inputValue, { decimalScale, allowNegative });
    if (parsedInput.value === null) {
      updateValue(min);
      return;
    }
    updateValue(parsedInput.value);
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
    <InputGroup
      data-slot="counter"
      className={cn(counterRootVariants({ size }), className)}
      aria-disabled={disabled}
    >
      <InputGroup.Input
        value={inputValue}
        inputMode="decimal"
        pattern={resolveNumericInputPattern(allowNegative, decimalScale)}
        onChange={changeInputValue}
        onBlur={applyClampedValueOnBlur}
        onKeyDown={captureArrowKeyForStepControl}
        disabled={disabled}
        invalid={invalid}
        className={cn('h-full text-center', inputClassName)}
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
          <Minus className="size-4" />
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
          <Plus className="size-4" />
        </InputGroup.Button>
      </InputGroup.Addon>
    </InputGroup>
  );
}

export { Counter, type CounterProps };
