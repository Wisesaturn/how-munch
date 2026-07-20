'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

import { type IngredientUnit } from '@/entities/ingredient';

import { formatIngredientAmountInfo, type FridgeBatchSelectOption } from '../lib';

interface FridgeBatchSelectScreenProps {
  /** 화면 닫기 핸들러 (Activity에서 주입) */
  onClose: () => void;
  /** 배치 선택 핸들러 — 선택된 batch_id를 반환한다 (Activity에서 주입) */
  onSelectBatch: (batchId: string) => void;
  /** 선택 가능한 배치(구매분) 목록 — 잔여 재고가 있는 배치만 */
  batches?: FridgeBatchSelectOption[];
  /** 냉장고 품목 단위 — 잔여 수량 표시용 */
  unit?: IngredientUnit;
}

/** 식단 배치(구매분) 선택 전용 Screen — 한 품목의 여러 구매분 중 하나를 선택한다 */
export function FridgeBatchSelectScreen({
  onClose: _onClose,
  onSelectBatch,
  batches = [],
  unit,
}: FridgeBatchSelectScreenProps) {
  return (
    <AppScreen className="pointer-events-auto" appBar={{ title: '구매분 선택' }}>
      <div className="flex flex-col gap-0">
        <p className="px-4 pt-3 pb-1 text-xs text-gray-400">
          오래된 구매분부터 표시됩니다. 소진/차감은 선택한 구매분에만 적용돼요.
        </p>

        {batches.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {batches.map((batch) => (
              <li key={batch.id}>
                <button
                  type="button"
                  onClick={() => onSelectBatch(batch.id)}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm text-gray-900">
                      {format(parseISO(batch.purchasedDate), 'yyyy.M.d', { locale: ko })} 구매
                    </span>
                    {batch.expiryDate ? (
                      <span className="truncate text-xs text-gray-400">
                        유통기한 {format(parseISO(batch.expiryDate), 'yyyy.M.d', { locale: ko })}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-sm font-medium text-gray-700">
                    {formatIngredientAmountInfo(Number(batch.quantity), unit)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center py-12 text-sm text-gray-400">
            <p>선택 가능한 구매분이 없습니다</p>
          </div>
        )}
      </div>
    </AppScreen>
  );
}
