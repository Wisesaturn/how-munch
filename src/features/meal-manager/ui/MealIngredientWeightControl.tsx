'use client';

import { Slider } from '@/commons/ui';

import { formatWeightAuto, type IngredientUnit } from '@/entities/ingredient';

interface MealIngredientWeightControlProps {
  disabled: boolean;
  min: number;
  max: number;
  value: number;
  step: number;
  unit: IngredientUnit | undefined;
  onChangeValue: (value: number) => void;
}

function MealIngredientWeightControl({
  disabled,
  min,
  max,
  value,
  step,
  unit,
  onChangeValue,
}: MealIngredientWeightControlProps) {
  const normalizedValue = step === 0.01 ? Number(value.toFixed(2)) : Math.round(value);

  const displayAmount = formatWeightAuto(normalizedValue, unit ?? 'g');

  return (
    <div className="space-y-1 pl-1">
      <Slider
        min={min}
        max={max}
        step={step}
        value={[normalizedValue]}
        disabled={disabled}
        onValueChange={(values) => onChangeValue(values[0] ?? min)}
      />
      <p className="text-right text-xs text-gray-500">{disabled ? '0g' : displayAmount}</p>
    </div>
  );
}

export { MealIngredientWeightControl };
