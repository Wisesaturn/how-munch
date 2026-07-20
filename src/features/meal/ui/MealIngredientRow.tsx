'use client';

import { format, parseISO } from 'date-fns';
import { ChevronRight, X } from 'lucide-react';

import { Badge, Button, Checkbox, Select } from '@/commons/ui';
import { cn } from '@/commons/lib';

import { isVolumeUnit, isWeightUnit, type IngredientUnit } from '@/entities/ingredient';

import {
  type EditorIngredient,
  formatIngredientAmountInfo,
  type IngredientUsageStatus,
  type MealFridgeBatch,
  resolveSliderBoundaries,
  resolveWeightSliderMin,
  resolveWeightSliderStep,
} from '../lib';
import { useMealEditorContext } from '../model';

import { MealIngredientWeightControl } from './MealIngredientWeightControl';

interface MealIngredientRowProps {
  ingredient: EditorIngredient;
  onIngredientItemChange: (value: string) => void;
  onIngredientBatchChange: (batchId: string) => void;
  onIngredientAmountChange: (value: string) => void;
  onUsageStatusChange: (status: IngredientUsageStatus) => void;
  onIngredientRemove: () => void;
}

/**
 * @description 배치(구매분) 정보를 "M.d 구매 · 잔여수량" 형태로 표시합니다.
 */
function formatBatchLabel(batch: MealFridgeBatch, unit: IngredientUnit | undefined) {
  const purchasedLabel = format(parseISO(batch.purchased_date), 'M.d');
  return `${purchasedLabel} 구매 · ${formatIngredientAmountInfo(Number(batch.quantity), unit)}`;
}

function MealIngredientRow({
  ingredient,
  onIngredientItemChange,
  onIngredientBatchChange,
  onIngredientAmountChange,
  onUsageStatusChange,
  onIngredientRemove,
}: MealIngredientRowProps) {
  const { fridgeItems, inUseStockAmountByBatchId, openFridgeItemSearch, openBatchSelect } =
    useMealEditorContext('MealIngredientRow');

  /* -------------------------------------------------------------------------- */
  /* Selection Constants                                                         */
  /* -------------------------------------------------------------------------- */
  const selectedIngredient = fridgeItems.find((item) => item.id === ingredient.fridge_item_id);
  const selectedUnit = selectedIngredient?.unit;
  const selectableBatches =
    selectedIngredient?.fridge_item_batches.filter((batch) => Number(batch.quantity) > 0) ?? [];
  const hasMultipleBatches = selectableBatches.length >= 2;
  const selectedBatch = selectedIngredient?.fridge_item_batches.find(
    (batch) => batch.id === ingredient.batch_id,
  );

  /* -------------------------------------------------------------------------- */
  /* Amount / Range Constants (개 단위 — 선택 배치 잔여 기준)                     */
  /* -------------------------------------------------------------------------- */
  const inUseStockAmount = ingredient.batch_id
    ? (inUseStockAmountByBatchId[ingredient.batch_id] ?? 0)
    : 0;
  const batchRemaining = selectedBatch ? Number(selectedBatch.quantity) : NaN;
  const maxAvailableAmount = Number.isFinite(batchRemaining)
    ? batchRemaining + inUseStockAmount
    : selectedBatch?.quantity;

  const sliderBoundary = resolveSliderBoundaries(maxAvailableAmount);
  const sliderStep = resolveWeightSliderStep(selectedUnit);
  const sliderMin = resolveWeightSliderMin(selectedUnit);
  const sliderValue = ingredient.amount > 0 ? ingredient.amount : sliderMin;
  const selectedAmount = Math.min(Math.max(sliderValue, sliderMin), sliderBoundary.max);
  const isAmountControlDisabled = !selectedBatch || sliderBoundary.max < 1;

  const ingredientSelectValue = ingredient.fridge_item_id;
  const isItemDepleted = selectedIngredient ? Number(selectedIngredient.total_count) <= 0 : false;
  const isUsageStatusUnit = isWeightUnit(selectedUnit) || isVolumeUnit(selectedUnit);

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
              {isItemDepleted ? (
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
                const itemDepleted = Number(item.total_count) <= 0;

                return (
                  <Select.Item key={item.id} value={item.id} disabled={itemDepleted}>
                    <span className="flex items-center gap-1.5">
                      <span>
                        {item.name}
                        {item.brand ? <span className="text-gray-400"> ({item.brand})</span> : null}
                      </span>
                      {itemDepleted ? (
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

      {/* 배치(구매분) 선택/표시 */}
      {selectedIngredient ? (
        <BatchRow
          batch={selectedBatch}
          unit={selectedUnit}
          selectable={hasMultipleBatches && Boolean(openBatchSelect)}
          onOpen={() => openBatchSelect?.(ingredient.fridge_item_id, onIngredientBatchChange)}
        />
      ) : null}

      {isUsageStatusUnit ? (
        <label
          className={cn(
            'flex cursor-pointer items-center gap-2',
            !selectedBatch && 'cursor-not-allowed',
          )}
        >
          <Checkbox
            checked={ingredient.usage_status === 'depleted'}
            onCheckedChange={(checked) =>
              onUsageStatusChange(checked === true ? 'depleted' : 'used')
            }
            disabled={!selectedBatch}
          />
          <span
            className={cn('text-sm', !selectedBatch ? 'text-muted-foreground' : 'text-gray-700')}
          >
            소진됨
          </span>
        </label>
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

/* -------------------------------------------------------------------------------------------------
 * BatchRow
 * -----------------------------------------------------------------------------------------------*/

interface BatchRowProps {
  batch: MealFridgeBatch | undefined;
  unit: IngredientUnit | undefined;
  selectable: boolean;
  onOpen: () => void;
}

function BatchRow({ batch, unit, selectable, onOpen }: BatchRowProps) {
  // 배치가 여러 개라 선택이 필요한 경우
  if (selectable) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center justify-between gap-1.5 rounded-md bg-gray-50 px-3 py-1.5 text-left text-xs text-gray-600 hover:bg-gray-100"
      >
        <span className="truncate">{batch ? formatBatchLabel(batch, unit) : '구매분 선택'}</span>
        <ChevronRight className="ml-1 size-3.5 shrink-0 text-gray-400" />
      </button>
    );
  }

  // 배치가 하나뿐이라 선택 불필요 — 정보만 표시
  if (batch) {
    return <p className="px-1 text-xs text-gray-400">{formatBatchLabel(batch, unit)}</p>;
  }

  return null;
}

export { MealIngredientRow };
