import * as React from 'react';

import { useControlledState } from 'react-simplikit';

import { InputGroup } from './InputGroup';

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/
function sanitizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

function normalizePrice(value: number, min: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.trunc(value));
}

function formatPrice(value: number) {
  return value.toLocaleString('ko-KR');
}

/* -------------------------------------------------------------------------------------------------
 * PriceInput
 * -----------------------------------------------------------------------------------------------*/
interface PriceInputProps extends Omit<React.ComponentProps<typeof InputGroup.Input>, 'onChange'> {
  value?: number;
  defaultValue?: number;
  min?: number;
  onChange?: (value: number) => void;
  onValueChange?: (value: number) => void;
}

function PriceInput({
  value,
  defaultValue = 0,
  min = 0,
  onChange,
  onValueChange,
  className,
  ...props
}: PriceInputProps) {
  const [currentValue, setCurrentValue] = useControlledState<number>({
    value,
    defaultValue: normalizePrice(defaultValue, min),
    onChange: (nextValue) => {
      onChange?.(nextValue);
      onValueChange?.(nextValue);
    },
  });

  const [inputText, setInputText] = React.useState(formatPrice(currentValue));

  React.useEffect(
    function syncFormattedPriceFromValue() {
      setInputText(formatPrice(currentValue));
    },
    [currentValue],
  );

  function changePrice(event: React.ChangeEvent<HTMLInputElement>) {
    const digits = sanitizeDigits(event.target.value);

    if (!digits) {
      setInputText('');
      setCurrentValue(min);
      return;
    }

    const parsedValue = Number.parseInt(digits, 10);
    const normalizedValue = normalizePrice(parsedValue, min);

    setCurrentValue(normalizedValue);
    setInputText(formatPrice(normalizedValue));
  }

  function restoreFormattedPriceOnBlur() {
    setInputText(formatPrice(currentValue));
  }

  return (
    <InputGroup className={className}>
      <InputGroup.Input
        value={inputText}
        inputMode="numeric"
        pattern="[0-9,]*"
        onChange={changePrice}
        onBlur={restoreFormattedPriceOnBlur}
        {...props}
      />
      <InputGroup.Addon align="inline-end">
        <InputGroup.Text className="px-2 text-sm font-medium text-gray-500">원</InputGroup.Text>
      </InputGroup.Addon>
    </InputGroup>
  );
}

export { PriceInput, type PriceInputProps };
