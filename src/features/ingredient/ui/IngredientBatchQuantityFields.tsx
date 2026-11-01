'use client';

import { format, parseISO } from 'date-fns';

import { cn } from '@/commons/lib';
import { Counter } from '@/commons/ui';

import {
  formatIngredientAmount,
  normalizeAmountByUnit,
  resolveAmountMin,
  resolveAmountStep,
  type IngredientUnit,
} from '@/entities/ingredient';

interface IngredientBatchQuantityFieldsProps {
  className?: string;
  unit: IngredientUnit;
  batches: {
    id: string;
    expiry_date: string | null;
    used_amount: number;
    next_quantity: number;
  }[];
  onQuantityChange: (batchId: string, quantity: number) => void;
}

/** 배치가 여러 개인 내역의 배치별 등록 수량 수정. 유통기한은 냉장고에서 고치므로 표시만 한다 */
export function IngredientBatchQuantityFields({
  className,
  unit,
  batches,
  onQuantityChange,
}: IngredientBatchQuantityFieldsProps) {
  return (
    <section className={cn('flex flex-col gap-3 rounded-lg border p-3', className)}>
      <p className="text-sm font-medium text-gray-700">배치별 등록 수량</p>
      {batches.map((batch, index) => (
        <div key={batch.id} className="flex items-center justify-between gap-3 border-t pt-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm text-gray-700">배치 {index + 1}</span>
            <span className="text-xs text-gray-400">
              {batch.expiry_date
                ? `유통기한 ${format(parseISO(batch.expiry_date), 'MM.dd')}`
                : '유통기한 없음'}
              {batch.used_amount > 0
                ? ` · 식단 ${formatIngredientAmount(batch.used_amount, unit, true)} 사용`
                : ''}
            </span>
          </div>
          <Counter
            className="w-40"
            size="sm"
            value={batch.next_quantity}
            min={Math.max(resolveAmountMin(unit), batch.used_amount)}
            step={resolveAmountStep(unit)}
            onValueChange={(quantity) =>
              onQuantityChange(batch.id, normalizeAmountByUnit(quantity, unit))
            }
          />
        </div>
      ))}
      <p className="text-xs text-gray-500">유통기한과 현재 수량은 냉장고에서 수정할 수 있어요.</p>
    </section>
  );
}
