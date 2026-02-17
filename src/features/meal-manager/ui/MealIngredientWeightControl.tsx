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

/**
 * @description 슬라이더 step 자릿수에 맞춰 표시/제어 값을 정규화합니다.
 * @example normalizeSliderValue(1.26, 0.1) // 1.3
 * @example normalizeSliderValue(1.26, 1) // 1
 */
function normalizeSliderValue(value: number, step: number) {
  if (step >= 1) return Math.round(value);

  const precision = String(step).split('.')[1]?.length ?? 0;
  return Number(value.toFixed(precision));
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
  const normalizedValue = normalizeSliderValue(value, step);
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
