'use client';

import { useState } from 'react';

import { useConditionalEffect } from 'react-simplikit';

import { parseSafeNumericInput } from '@/commons/lib';
import { InputGroup, ProgressBar } from '@/commons/ui';

import { type IngredientUnit } from '@/entities/ingredient';

interface MealIngredientCountControlProps {
  disabled: boolean;
  amount: number;
  max: number;
  unit: IngredientUnit | undefined;
  unitLabel: string;
  onAmountChange: (value: string) => void;
}

/**
 * @description 단위 기준으로 입력 허용 소수점 자릿수를 계산합니다.
 */
function resolveDecimalScaleByUnit(unit?: IngredientUnit) {
  if (unit === 'kg') return 1;
  return 0;
}

function MealIngredientCountControl({
  disabled,
  amount,
  max,
  unit,
  unitLabel,
  onAmountChange,
}: MealIngredientCountControlProps) {
  const decimalScale = resolveDecimalScaleByUnit(unit);
  const [inputValue, setInputValue] = useState(
    amount === 0 ? '' : parseSafeNumericInput(amount, { decimalScale }).text,
  );
  const displayAmount = amount > 0 ? Math.min(amount, max) : 0;
  const inputMode = unit === 'kg' ? 'decimal' : 'numeric';

  useConditionalEffect(
    function syncInputValueFromAmount() {
      setInputValue(amount === 0 ? '' : parseSafeNumericInput(amount, { decimalScale }).text);
    },
    [amount, decimalScale] as const,
    (previousDeps, currentDeps) =>
      previousDeps?.[0] !== currentDeps[0] || previousDeps?.[1] !== currentDeps[1],
  );

  return (
    <div className="space-y-1">
      <InputGroup className="w-full">
        <InputGroup.Input
          value={inputValue}
          onChange={(event) => {
            const parsedInput = parseSafeNumericInput(event.target.value, {
              decimalScale,
              allowNegative: false,
            });
            setInputValue(parsedInput.text);
            if (parsedInput.value === null) return;
            onAmountChange(String(parsedInput.value));
          }}
          type="text"
          inputMode={inputMode}
          placeholder="0"
          disabled={disabled}
        />
        <InputGroup.Addon align="inline-end" className="min-w-9 justify-center px-2">
          <InputGroup.Text>{unitLabel}</InputGroup.Text>
        </InputGroup.Addon>
      </InputGroup>
      <ProgressBar value={displayAmount} max={max} className="h-1.5" />
      <p className="text-right text-xs text-gray-500">
        {disabled ? `0 ${unitLabel}` : `${displayAmount} / ${max} ${unitLabel}`}
      </p>
    </div>
  );
}

export { MealIngredientCountControl };
