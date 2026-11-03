'use client';

import { useState } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';

import { CTAButton, type OpenPriceCalculator } from '@/commons/ui';

import { type DiningExpenseKind } from '@/entities/dining-expense';

import { useDiningExpenseSuggestionsQuery } from '../api/queries';

import { DiningExpenseForm, type DiningExpenseFormValues } from './DiningExpenseForm';

interface DiningExpenseDraftScreenProps {
  householdId: string;
  defaultValues: Partial<DiningExpenseFormValues>;
  onClose: () => void;
  /** "완료"를 누르면 입력값을 돌려준다. 저장은 부른 쪽이 한다 */
  onDone: (values: DiningExpenseFormValues) => void;
  onOpenAmountCalculator: OpenPriceCalculator;
}

/** 저장 전 외식비를 외식비 입력 화면과 같은 폼으로 고치는 화면 */
export function DiningExpenseDraftScreen({
  householdId,
  defaultValues,
  onClose,
  onDone,
  onOpenAmountCalculator,
}: DiningExpenseDraftScreenProps) {
  const [kind, setKind] = useState<DiningExpenseKind>(defaultValues.kind ?? 'restaurant');
  const { data: brandNames } = useDiningExpenseSuggestionsQuery(householdId, 'brand', kind);
  const { data: storeNames } = useDiningExpenseSuggestionsQuery(householdId, 'store', 'delivery');
  const formId = 'dining-expense-draft-form';

  return (
    <AppScreen className="pointer-events-auto" appBar={{ title: '외식비 수정' }}>
      <div className="px-4 pt-4 pb-28">
        <DiningExpenseForm
          formId={formId}
          defaultValues={defaultValues}
          brandNames={brandNames}
          storeNames={storeNames}
          onKindChange={setKind}
          onOpenAmountCalculator={onOpenAmountCalculator}
          onSubmit={(values) => {
            onDone(values);
            onClose();
          }}
        />
      </div>
      <CTAButton type="submit" form={formId} color="confirm" variant="filled">
        완료
      </CTAButton>
    </AppScreen>
  );
}
