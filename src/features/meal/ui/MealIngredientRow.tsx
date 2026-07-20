'use client';

import { ChevronRight, X } from 'lucide-react';

import { Badge, Button, SegmentControl, Select } from '@/commons/ui';
import { cn } from '@/commons/lib';

import { isVolumeUnit, isWeightUnit } from '@/entities/ingredient';

import {
  type EditorIngredient,
  type IngredientUsageStatus,
  resolveSliderBoundaries,
  resolveWeightSliderMin,
  resolveWeightSliderStep,
} from '../lib';
import { useMealEditorContext } from '../model';

import { MealIngredientWeightControl } from './MealIngredientWeightControl';

interface MealIngredientRowProps {
  ingredient: EditorIngredient;
  onIngredientItemChange: (value: string) => void;
  onIngredientAmountChange: (value: string) => void;
  onUsageStatusChange: (status: IngredientUsageStatus) => void;
  onIngredientRemove: () => void;
}

function MealIngredientRow({
  ingredient,
  onIngredientItemChange,
  onIngredientAmountChange,
  onUsageStatusChange,
  onIngredientRemove,
}: MealIngredientRowProps) {
  const { fridgeItems, inUseStockAmountByItemId, openFridgeItemSearch } =
    useMealEditorContext('MealIngredientRow');

  /* -------------------------------------------------------------------------- */
  /* Selection Constants                                                         */
  /* -------------------------------------------------------------------------- */
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
  const sliderBoundary = resolveSliderBoundaries(selectedMaxAvailableAmount);
  const sliderStep = resolveWeightSliderStep(selectedUnit);
  const sliderMin = resolveWeightSliderMin(selectedUnit);

  /* -------------------------------------------------------------------------- */
  /* Display / Control Constants                                                 */
  /* -------------------------------------------------------------------------- */
  const sliderValue = ingredient.amount > 0 ? ingredient.amount : sliderMin;
  const selectedAmount = Math.min(Math.max(sliderValue, sliderMin), sliderBoundary.max);
  const isAmountControlDisabled = !selectedIngredient || sliderBoundary.max < 1;
  const ingredientSelectValue = ingredient.fridge_item_id;

  const isDepleted = selectedIngredient ? Number(selectedIngredient.total_count) <= 0 : false;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        {openFridgeItemSearch ? (
          <button
            type="button"
            onClick={() => openFridgeItemSearch(ingredientSelectValue, onIngredientItemChange)}
            className={cn(
              'border-input flex h-10 min-w-0 flex-1 items-center justify-between gap-1.5 rounded-md border bg-white px-3 py-2 text-sm',
              'hover:bg-accent transition-colors',
              !selectedIngredient && 'text-muted-foreground',
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {selectedIngredient ? (
                <span className="truncate">
                  {selectedIngredient.name}
                  {selectedIngredient.brand ? (
                    <span className="text-gray-400"> ({selectedIngredient.brand})</span>
                  ) : null}
                </span>
              ) : (
                <span className="truncate">재료 선택</span>
              )}
              {isDepleted ? (
                <Badge
                  variant="outline"
                  className="shrink-0 border-red-200 bg-red-50 px-1.5 py-0 text-[10px] text-red-600"
                >
                  소진
                </Badge>
              ) : null}
            </span>
            <ChevronRight className="text-muted-foreground ml-1 size-4 shrink-0" />
          </button>
        ) : (
          <Select value={ingredientSelectValue} onValueChange={onIngredientItemChange}>
            <Select.Trigger className="min-w-0 flex-1">
              <Select.Value placeholder="재료 선택" />
            </Select.Trigger>
            <Select.Content>
              {fridgeItems.map((item) => {
                const isItemDepleted = Number(item.total_count) <= 0;

                return (
                  <Select.Item key={item.id} value={item.id} disabled={isItemDepleted}>
                    <span className="flex items-center gap-1.5">
                      <span>
                        {item.name}
                        {item.brand ? <span className="text-gray-400"> ({item.brand})</span> : null}
                      </span>
                      {isItemDepleted ? (
                        <Badge
                          variant="outline"
                          className="border-red-200 bg-red-50 px-1.5 py-0 text-[10px] text-red-600"
                        >
                          소진
                        </Badge>
                      ) : null}
                    </span>
                  </Select.Item>
                );
              })}
            </Select.Content>
          </Select>
        )}

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 text-gray-500 hover:text-red-500"
          onClick={onIngredientRemove}
          aria-label="재료 삭제"
        >
          <X className="size-4" />
        </Button>
      </div>

      {isWeightUnit(selectedUnit) || isVolumeUnit(selectedUnit) ? (
        <div className="space-y-1">
          <SegmentControl
            size="sm"
            value={ingredient.usage_status}
            onValueChange={(value) => onUsageStatusChange(value as IngredientUsageStatus)}
            disabled={!selectedIngredient}
          >
            <SegmentControl.Item value="used">사용</SegmentControl.Item>
            <SegmentControl.Item value="depleted_batch">묶음 소진</SegmentControl.Item>
            <SegmentControl.Item value="depleted">전부 소진</SegmentControl.Item>
          </SegmentControl>
          <p className="text-xs text-gray-400">‘묶음 소진’은 가장 오래된 구매분 하나만 비워요.</p>
        </div>
      ) : (
        <MealIngredientWeightControl
          min={sliderMin}
          max={sliderBoundary.max}
          value={selectedAmount}
          disabled={isAmountControlDisabled}
          unit={selectedUnit}
          step={sliderStep}
          onValueChange={(value) => onIngredientAmountChange(String(value))}
        />
      )}
    </div>
  );
}

export { MealIngredientRow };
