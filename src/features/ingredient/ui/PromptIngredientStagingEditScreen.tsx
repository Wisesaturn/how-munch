'use client';

import { ChevronLeft } from 'lucide-react';
import { AppScreen } from '@stackflow/plugin-basic-ui';

import { Button, CTAButton, type OpenPriceCalculator } from '@/commons/ui';

import { type StagedItem } from '../lib/parseAiResponse';
import {
  resolvePendingPromptEditCallback,
  clearPendingPromptEditCallback,
} from '../model/promptIngredientEditStore';
import { useStoreNamesQuery } from '../api/queries';

import { IngredientForm, type IngredientFormValues } from './IngredientForm';

interface PromptIngredientStagingEditScreenProps {
  onClose: () => void;
  item: StagedItem;
  householdId: string;
  /** 품목명 검색 Screen 진입 핸들러 — 선택값은 form name 필드에 반영된다 */
  onOpenProductNameSearch?: (currentName: string, onSelect: (name: string) => void) => void;
  /** 브랜드 검색 Screen 진입 핸들러 — 선택값은 form brand 필드에 반영된다 */
  onOpenBrandSearch?: (currentBrand: string, onSelect: (brand: string) => void) => void;
  /** 계산기 화면 열기 핸들러 (Activity에서 주입) */
  onOpenAmountCalculator: OpenPriceCalculator;
}

export function PromptIngredientStagingEditScreen({
  onClose,
  item,
  householdId,
  onOpenProductNameSearch,
  onOpenBrandSearch,
  onOpenAmountCalculator,
}: PromptIngredientStagingEditScreenProps) {
  const { data: storeNames } = useStoreNamesQuery(householdId);
  const formId = `ai-staging-edit-form-${item.id}`;

  function handleSubmit(values: IngredientFormValues) {
    resolvePendingPromptEditCallback({
      name: values.name,
      brand: values.brand,
      price: values.price,
      count: values.count,
      unit: values.unit,
      store: values.store,
      date: values.date,
      category_id: values.category_id,
      expiry_date: values.expiry_date,
      batches: values.batches,
    });
    onClose();
  }

  function handleClose() {
    clearPendingPromptEditCallback();
    onClose();
  }

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: '항목 수정',
        backButton: {
          render: () => (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleClose}
              aria-label="뒤로가기"
            >
              <ChevronLeft className="size-5" />
            </Button>
          ),
        },
      }}
    >
      <div className="px-4 pt-4 pb-28">
        <IngredientForm
          formId={formId}
          householdId={householdId}
          defaultValues={{
            date: item.date,
            category_id: item.category_id,
            name: item.name,
            brand: item.brand,
            count: item.count,
            unit: item.unit,
            store: item.store,
            price: item.price,
            expiry_date: item.expiry_date,
            batches: item.batches,
          }}
          storeNames={storeNames}
          onSubmit={handleSubmit}
          enableBatchPlanning
          onOpenProductNameSearch={onOpenProductNameSearch}
          onOpenBrandSearch={onOpenBrandSearch}
          onOpenAmountCalculator={onOpenAmountCalculator}
        />
      </div>
      <CTAButton type="submit" form={formId} color="confirm" variant="filled" hideOnScroll>
        수정 완료
      </CTAButton>
    </AppScreen>
  );
}
