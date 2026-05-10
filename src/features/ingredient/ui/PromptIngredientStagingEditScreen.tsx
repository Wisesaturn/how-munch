'use client';

import { ChevronLeft } from 'lucide-react';
import { AppScreen } from '@stackflow/plugin-basic-ui';

import { Button, CTAButton } from '@/commons/ui';

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
}

export function PromptIngredientStagingEditScreen({
  onClose,
  item,
  householdId,
}: PromptIngredientStagingEditScreenProps) {
  const { data: storeNames } = useStoreNamesQuery(householdId);
  const formId = `ai-staging-edit-form-${item.id}`;

  function handleSubmit(values: IngredientFormValues) {
    resolvePendingPromptEditCallback({
      name: values.name,
      price: values.price,
      count: values.count,
      unit: values.unit,
      store: values.store,
      date: values.date,
      category_id: values.category_id,
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
            brand: '',
            count: item.count,
            unit: item.unit,
            store: item.store,
            price: item.price,
          }}
          storeNames={storeNames}
          onSubmit={handleSubmit}
        />
      </div>
      <CTAButton type="submit" form={formId} color="confirm" variant="filled" hideOnScroll>
        수정 완료
      </CTAButton>
    </AppScreen>
  );
}
