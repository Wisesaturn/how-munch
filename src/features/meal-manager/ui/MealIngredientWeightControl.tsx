'use client';

import { Slider } from '@/commons/ui';

interface MealIngredientWeightControlProps {
  disabled: boolean;
  min: number;
  max: number;
  value: number;
  unitLabel: string;
  onChangeValue: (value: number) => void;
}

function MealIngredientWeightControl({
  disabled,
  min,
  max,
  value,
  unitLabel,
  onChangeValue,
}: MealIngredientWeightControlProps) {
  return (
    <div className="space-y-1 pl-1">
      <Slider
        min={min}
        max={max}
        step={1}
        value={[value]}
        disabled={disabled}
        onValueChange={(values) => onChangeValue(values[0] ?? min)}
      />
      <p className="text-right text-xs text-gray-500">
        {disabled ? `0 ${unitLabel}` : `${value} ${unitLabel}`}
      </p>
    </div>
  );
}

export { MealIngredientWeightControl };
