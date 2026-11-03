'use client';

import { useState } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';

import { CTAButton } from '@/commons/ui';

import { type IngredientUnit } from '@/entities/ingredient';

import { type EditorDish, type FridgeBatchSelectOption, type FridgeItemSearchOption } from '../lib';

import { MealDishesEditor } from './MealDishesEditor';

interface MealDraftEditorScreenProps {
  householdId: string;
  title: string;
  dishes: EditorDish[];
  onClose: () => void;
  /** "완료"를 누르면 고친 메뉴를 돌려준다. 저장은 부른 쪽이 한다 */
  onDone: (dishes: EditorDish[]) => void;
  onOpenFridgeItemSearch?: (
    items: FridgeItemSearchOption[],
    onSelectId: (fridgeItemId: string) => void,
  ) => void;
  onOpenFridgeBatchSelect?: (
    batches: FridgeBatchSelectOption[],
    unit: IngredientUnit,
    onSelectBatchId: (batchId: string) => void,
  ) => void;
}

/** 저장 전 메뉴를 식단 수정 화면과 같은 메뉴 카드로 고치는 화면 */
export function MealDraftEditorScreen({
  householdId,
  title,
  dishes: initialDishes,
  onClose,
  onDone,
  onOpenFridgeItemSearch,
  onOpenFridgeBatchSelect,
}: MealDraftEditorScreenProps) {
  const [dishes, setDishes] = useState<EditorDish[]>(() =>
    initialDishes.length > 0 ? initialDishes : [{ name: '', ingredients: [] }],
  );

  return (
    <AppScreen className="pointer-events-auto" appBar={{ title }}>
      <div className="px-4 pt-4 pb-28">
        <MealDishesEditor
          householdId={householdId}
          dishes={dishes}
          onDishesChange={setDishes}
          onOpenFridgeItemSearch={onOpenFridgeItemSearch}
          onOpenFridgeBatchSelect={onOpenFridgeBatchSelect}
        />
      </div>
      <CTAButton
        type="button"
        color="confirm"
        variant="filled"
        onClick={() => {
          onDone(dishes);
          onClose();
        }}
      >
        완료
      </CTAButton>
    </AppScreen>
  );
}
