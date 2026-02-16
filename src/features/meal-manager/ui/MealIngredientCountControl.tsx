'use client';

import { InputGroup, ProgressBar } from '@/commons/ui';

interface MealIngredientCountControlProps {
  disabled: boolean;
  amount: number;
  max: number;
  unitLabel: string;
  onChangeAmount: (value: string) => void;
}

function MealIngredientCountControl({
  disabled,
  amount,
  max,
  unitLabel,
  onChangeAmount,
}: MealIngredientCountControlProps) {
  const displayAmount = amount > 0 ? Math.min(amount, max) : 0;

  return (
    <div className="space-y-1">
      <InputGroup className="w-full">
        <InputGroup.Input
          value={amount === 0 ? '' : String(amount)}
          onChange={(event) => onChangeAmount(event.target.value)}
          type="text"
          inputMode="numeric"
          placeholder="0"
          disabled={disabled}
        />
        <InputGroup.Addon align="inline-end" className="min-w-9 justify-center px-2">
          <InputGroup.Text>개</InputGroup.Text>
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
