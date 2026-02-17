'use client';

import { X } from 'lucide-react';

import { Button, Select } from '@/commons/ui';

import { isWeightUnit } from '@/entities/ingredient';

import {
  type EditorIngredient,
  resolveIngredientUnitLabel,
  resolveSliderBoundaries,
  resolveWeightSliderMin,
  resolveWeightSliderStep,
} from '../lib';
import { useMealEditorContext } from '../model';

import { MealIngredientCountControl } from './MealIngredientCountControl';
import { MealIngredientWeightControl } from './MealIngredientWeightControl';

interface MealIngredientRowProps {
  ingredient: EditorIngredient;
  onChangeIngredientItem: (value: string) => void;
  onChangeIngredientAmount: (value: string) => void;
  onRemoveIngredient: () => void;
}

function MealIngredientRow({
  ingredient,
  onChangeIngredientItem,
  onChangeIngredientAmount,
  onRemoveIngredient,
}: MealIngredientRowProps) {
  const { fridgeItems, inUseStockAmountByItemId } = useMealEditorContext('MealIngredientRow');

  /* -------------------------------------------------------------------------- */
  /* Selection Constants                                                         */
  /* -------------------------------------------------------------------------- */
  const emptySelectValue = '__none__';
  const selectedIngredient = fridgeItems.find((item) => item.id === ingredient.fridge_item_id);
  const inUseStockAmount = selectedIngredient
    ? (inUseStockAmountByItemId[selectedIngredient.id] ?? 0)
    : 0;
  const selectedRemainingAmount = selectedIngredient ? Number(selectedIngredient.total_count) : NaN;
  const selectedMaxAvailableAmount = Number.isFinite(selectedRemainingAmount)
    ? selectedRemainingAmount + inUseStockAmount
    : selectedIngredient?.total_count;

  /* -------------------------------------------------------------------------- */
  /* Unit / Range Constants                                                      */
  /* -------------------------------------------------------------------------- */
  const selectedUnit = selectedIngredient?.unit;
  const unitLabel = resolveIngredientUnitLabel(selectedUnit);
  const sliderBoundary = resolveSliderBoundaries(selectedMaxAvailableAmount);
  const sliderStep = resolveWeightSliderStep(selectedUnit);
  const sliderMin = resolveWeightSliderMin(selectedUnit);

  /* -------------------------------------------------------------------------- */
  /* Display / Control Constants                                                 */
  /* -------------------------------------------------------------------------- */
  const sliderValue = ingredient.amount > 0 ? ingredient.amount : sliderMin;
  const selectedAmount = Math.min(Math.max(sliderValue, sliderMin), sliderBoundary.max);
  const isAmountControlDisabled =
    !selectedIngredient ||
    (isWeightUnit(selectedUnit) ? sliderBoundary.max < sliderMin : sliderBoundary.max < 1);
  const isCountInputDisabled = !selectedIngredient || sliderBoundary.max < 1;
  const ingredientSelectValue = ingredient.fridge_item_id || emptySelectValue;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Select value={ingredientSelectValue} onValueChange={onChangeIngredientItem}>
          <Select.Trigger className="min-w-0 flex-1">
            <Select.Value placeholder="재료 선택" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value={emptySelectValue}>재료 선택</Select.Item>
            {fridgeItems.map((item) => (
              <Select.Item key={item.id} value={item.id}>
                {item.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 text-gray-500 hover:text-red-500"
          onClick={onRemoveIngredient}
          aria-label="재료 삭제"
        >
          <X className="size-4" />
        </Button>
      </div>

      {isWeightUnit(selectedUnit) ? (
        <MealIngredientCountControl
          amount={ingredient.amount}
          max={sliderBoundary.max}
          unitLabel={unitLabel}
          disabled={isCountInputDisabled}
          onChangeAmount={onChangeIngredientAmount}
        />
      ) : (
        <MealIngredientWeightControl
          min={sliderMin}
          max={sliderBoundary.max}
          value={selectedAmount}
          disabled={isAmountControlDisabled}
          unit={selectedUnit}
          step={sliderStep}
          onValueChange={(value) => onChangeIngredientAmount(String(value))}
        />
      )}
    </div>
  );
}

export { MealIngredientRow };
