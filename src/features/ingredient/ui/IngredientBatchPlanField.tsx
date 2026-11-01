'use client';

import { format, parseISO } from 'date-fns';

import { Button, Counter, DatePicker } from '@/commons/ui';
import { Form } from '@/commons/ui/Form';

import {
  normalizeAmountByUnit,
  resolveAmountMin,
  resolveAmountStep,
  type IngredientUnit,
} from '@/entities/ingredient';

import {
  createBatchDrafts,
  type IngredientBatchDraft,
  resolveDefaultBatchParts,
  resolveEarliestExpiry,
  resolveMaxBatchParts,
  sumBatchQuantity,
} from '../lib/ingredientBatch';

interface ExpiryDateInputProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
}

/** 유통기한 선택과 지우기 — 지운 값은 null로 저장되어 카테고리 기본값으로 되살아나지 않는다 */
function ExpiryDateInput({ value, onValueChange }: ExpiryDateInputProps) {
  return (
    <div className="flex items-center gap-2">
      <DatePicker
        className="flex-1"
        value={value ? parseISO(value) : undefined}
        onChange={(date) => onValueChange(date ? format(date, 'yyyy-MM-dd') : null)}
        placeholder="유통기한을 선택하세요"
      />
      {value ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => onValueChange(null)}>
          지우기
        </Button>
      ) : null}
    </div>
  );
}

interface IngredientBatchPlanFieldProps {
  unit: IngredientUnit;
  count: number;
  /** 나누지 않았을 때 표시할 유통기한 (카테고리 기본값 포함) */
  expiryDate: string | null;
  expiryError?: string;
  batches: IngredientBatchDraft[];
  onExpiryChange: (expiry: string | null) => void;
  onBatchesChange: (batches: IngredientBatchDraft[]) => void;
}

/** 등록 화면의 유통기한 입력과 배치 나누기 */
export function IngredientBatchPlanField({
  unit,
  count,
  expiryDate,
  expiryError,
  batches,
  onExpiryChange,
  onBatchesChange,
}: IngredientBatchPlanFieldProps) {
  const quantityMin = resolveAmountMin(unit);
  const quantityStep = resolveAmountStep(unit);

  if (batches.length === 0) {
    const canSplit = resolveMaxBatchParts(count, unit) >= 2;

    return (
      <div className="flex flex-col gap-2">
        <Form.Label>유통기한</Form.Label>
        <ExpiryDateInput value={expiryDate} onValueChange={onExpiryChange} />
        {expiryError ? <p className="text-destructive text-xs">{expiryError}</p> : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canSplit}
          onClick={() =>
            onBatchesChange(
              createBatchDrafts(count, resolveDefaultBatchParts(count, unit), unit, [], expiryDate),
            )
          }
        >
          배치 나누기
        </Button>
        {!canSplit ? (
          <p className="text-xs text-gray-500">수량이 2개 이상이어야 나눌 수 있어요.</p>
        ) : null}
      </div>
    );
  }

  const total = sumBatchQuantity(batches, unit);

  function updateBatch(batchId: string, updates: Partial<IngredientBatchDraft>) {
    onBatchesChange(
      batches.map((batch) => (batch.id === batchId ? { ...batch, ...updates } : batch)),
    );
  }

  function cancelSplit() {
    onExpiryChange(resolveEarliestExpiry(batches));
    onBatchesChange([]);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <Form.Label>나눌 개수</Form.Label>
        <Counter
          className="w-40"
          size="sm"
          value={batches.length}
          min={2}
          max={Math.max(resolveMaxBatchParts(total, unit), batches.length)}
          step={1}
          onValueChange={(parts) =>
            onBatchesChange(
              createBatchDrafts(total, parts, unit, batches, batches[0]?.expiry_date ?? null),
            )
          }
        />
      </div>

      {batches.map((batch, index) => (
        <div key={batch.id} className="flex flex-col gap-2 border-t pt-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-gray-700">배치 {index + 1}</span>
            <Counter
              className="w-40"
              size="sm"
              value={batch.quantity}
              min={quantityMin}
              step={quantityStep}
              aria-label={`배치 ${index + 1} 수량`}
              onValueChange={(quantity) =>
                updateBatch(batch.id, { quantity: normalizeAmountByUnit(quantity, unit) })
              }
            />
          </div>
          <ExpiryDateInput
            value={batch.expiry_date}
            onValueChange={(expiry_date) => updateBatch(batch.id, { expiry_date })}
          />
        </div>
      ))}

      <Button type="button" variant="ghost" size="sm" onClick={cancelSplit}>
        나누기 취소
      </Button>
    </div>
  );
}
