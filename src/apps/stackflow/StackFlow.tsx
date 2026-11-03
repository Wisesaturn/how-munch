'use client';

import { useRef } from 'react';

import { basicUIPlugin } from '@stackflow/plugin-basic-ui';
import { historySyncPlugin } from '@stackflow/plugin-history-sync';
import { basicRendererPlugin } from '@stackflow/plugin-renderer-basic';
import { useActions, useActivity, stackflow } from '@stackflow/react';

import {
  resolvePendingVoiceDishesCallback,
  resolvePendingVoiceExpenseCallback,
  setPendingVoiceDishesCallback,
  setPendingVoiceExpenseCallback,
} from '@/apps/stackflow/voiceDraftCallbacks';

import { type OpenPriceCalculator } from '@/commons/ui';

import { type DiningExpense } from '@/entities/dining-expense';
import { type FoodExpense } from '@/entities/food-expense';
import { type Ingredient, type IngredientUnit } from '@/entities/ingredient';
import { type FridgeItemBatch, type FridgeItemWithBatches } from '@/entities/fridge-item';
import { type Meal, type MealType } from '@/entities/meal';
import { useIngredientCategoriesQuery } from '@/entities/ingredient-category';

import {
  AmountCalculatorScreen,
  clearPendingAmountCalculatorCallback,
  parseCalculatorAmount,
  parseCalculatorNullable,
  resolvePendingAmountCalculatorCallback,
  setPendingAmountCalculatorCallback,
} from '@/features/amount-calculator';
import { BudgetEditScreen, BudgetScreen } from '@/features/budget';
import {
  DiningExpenseAddScreen,
  DiningExpenseDraftScreen,
  DiningExpenseEditScreen,
} from '@/features/dining-expense';
import {
  FoodExpenseItem,
  FoodExpenseSearchScreen,
  toDiningExpense,
  toIngredient,
} from '@/features/food-expense';
import {
  FridgeBatchEditScreen,
  FridgeExpiryListScreen,
  FridgeFilterSettingsScreen,
  FridgeItemAddScreen,
  FridgeItemEditScreen,
  FridgeItemSubdivideScreen,
  useFridgeBrandNamesQuery,
} from '@/features/fridge';
import {
  PromptIngredientAddScreen,
  PromptIngredientStagingEditScreen,
  PromptIngredientStagingScreen,
  clearPendingProductNameCallback,
  IngredientAddScreen,
  IngredientEditScreen,
  IngredientItem,
  ProductNameSearchScreen,
  resolvePendingProductNameCallback,
  setPendingProductNameCallback,
  setPendingPromptEditCallback,
  type StagedItem,
  useIngredientBrandNamesQuery,
} from '@/features/ingredient';
import {
  MealEditorScreen,
  MealDraftCard,
  MealDraftEditorScreen,
  FridgeItemSearchScreen,
  FridgeBatchSelectScreen,
  setPendingFridgeItemCallback,
  resolvePendingFridgeItemCallback,
  clearPendingFridgeItemCallback,
  setPendingFridgeBatchCallback,
  resolvePendingFridgeBatchCallback,
  clearPendingFridgeBatchCallback,
  type FridgeItemSearchOption,
  type FridgeBatchSelectOption,
} from '@/features/meal';
import { NotificationScreen, NotificationSettingsScreen } from '@/features/notification';
import { ProfileEditScreen, ProfileSettingsScreen } from '@/features/profile';
import { SearchSynonymSettingsScreen } from '@/features/search-synonym';
import {
  type ParsedExpense,
  type ParsedPurchase,
  VoiceMealResultScreen,
  type VoiceResultAdapters,
} from '@/features/voice-meal-entry';

/** 금액 칸이 쓸 계산기 열기 함수 — 콜백을 등록한 뒤 계산기 Activity를 연다 */
function useOpenAmountCalculator(): OpenPriceCalculator {
  const { push } = useActions();

  return function openAmountCalculator({ title, value, nullable, onConfirm }) {
    setPendingAmountCalculatorCallback(onConfirm);
    push('AmountCalculatorActivity', {
      title,
      // history-sync가 params를 URL로 직렬화하므로 없는 값은 키째 뺀다
      ...(value === null ? {} : { value }),
      ...(nullable ? { nullable } : {}),
    });
  };
}

function IdleActivity() {
  const activity = useActivity();

  return <div data-stackflow-idle-active={activity.isActive ? 'true' : 'false'} />;
}

function PlaceholderActivity() {
  return null;
}

function IngredientAddActivity({
  params,
}: {
  params: {
    householdId: string;
    userId: string;
    defaultName?: string;
    suggestions?: string[];
  };
}) {
  const { pop, push } = useActions();
  const { data: brandNames } = useIngredientBrandNamesQuery(params.householdId);

  function openProductNameSearch(currentName: string, onSelect: (name: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '품목명',
      suggestions: params.suggestions ?? [],
      currentName,
    });
  }

  function openBrandSearch(currentBrand: string, onSelect: (brand: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '브랜드',
      suggestions: brandNames ?? [],
      currentName: currentBrand,
    });
  }

  const openAmountCalculator = useOpenAmountCalculator();

  return (
    <IngredientAddScreen
      onOpenAmountCalculator={openAmountCalculator}
      onClose={pop}
      householdId={params.householdId}
      userId={params.userId}
      defaultName={params.defaultName}
      onOpenProductNameSearch={openProductNameSearch}
      onOpenBrandSearch={openBrandSearch}
    />
  );
}

function FridgeItemAddActivity({
  params,
}: {
  params: {
    householdId: string;
    suggestions?: string[];
  };
}) {
  const { pop, push } = useActions();
  const { data: brandNames } = useFridgeBrandNamesQuery(params.householdId);

  function openProductNameSearch(currentName: string, onSelect: (name: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '재료명',
      suggestions: params.suggestions ?? [],
      currentName,
    });
  }

  function openBrandSearch(currentBrand: string, onSelect: (brand: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '브랜드',
      suggestions: brandNames ?? [],
      currentName: currentBrand,
    });
  }

  return (
    <FridgeItemAddScreen
      onClose={pop}
      householdId={params.householdId}
      onOpenProductNameSearch={openProductNameSearch}
      onOpenBrandSearch={openBrandSearch}
    />
  );
}

function FridgeItemEditActivity({
  params,
}: {
  params: {
    item: FridgeItemWithBatches;
    suggestions?: string[];
  };
}) {
  const { pop, push } = useActions();
  const { data: brandNames } = useFridgeBrandNamesQuery(params.item.household_id);

  function openProductNameSearch(currentName: string, onSelect: (name: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '재료명',
      suggestions: params.suggestions ?? [],
      currentName,
    });
  }

  function openBrandSearch(currentBrand: string, onSelect: (brand: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '브랜드',
      suggestions: brandNames ?? [],
      currentName: currentBrand,
    });
  }

  function openSubdivide() {
    push('FridgeItemSubdivideActivity', {
      fridgeItemId: params.item.id,
      itemName: params.item.name,
      totalCount: params.item.total_count,
      unit: params.item.unit,
      batches: params.item.fridge_item_batches.filter((b) => !b.deleted_at),
    });
  }

  return (
    <FridgeItemEditScreen
      onClose={pop}
      item={params.item}
      onOpenSubdivide={openSubdivide}
      onOpenProductNameSearch={openProductNameSearch}
      onOpenBrandSearch={openBrandSearch}
    />
  );
}

function FridgeItemSubdivideActivity({
  params,
}: {
  params: {
    fridgeItemId: string;
    itemName: string;
    totalCount: number;
    unit: IngredientUnit;
    batches: FridgeItemBatch[];
  };
}) {
  const { pop } = useActions();

  return (
    <FridgeItemSubdivideScreen
      onSuccess={() => pop(2)}
      fridgeItemId={params.fridgeItemId}
      itemName={params.itemName}
      totalCount={params.totalCount}
      unit={params.unit}
      batches={params.batches}
    />
  );
}

function FridgeBatchEditActivity({
  params,
}: {
  params: {
    batch: FridgeItemBatch;
    unit: IngredientUnit;
  };
}) {
  const { pop } = useActions();

  return <FridgeBatchEditScreen onClose={pop} batch={params.batch} unit={params.unit} />;
}

function FridgeFilterSettingsActivity() {
  const { pop } = useActions();

  return <FridgeFilterSettingsScreen onClose={pop} />;
}

function FridgeExpiryListActivity({
  params,
}: {
  params: {
    items: FridgeItemWithBatches[];
  };
}) {
  const { pop } = useActions();

  return <FridgeExpiryListScreen onClose={pop} items={params.items} />;
}

function IngredientEditActivity({
  params,
}: {
  params: {
    householdId: string;
    ingredient: Ingredient;
    suggestions?: string[];
  };
}) {
  const { pop, push } = useActions();
  const { data: brandNames } = useIngredientBrandNamesQuery(params.householdId);

  function openProductNameSearch(currentName: string, onSelect: (name: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '품목명',
      suggestions: params.suggestions ?? [],
      currentName,
    });
  }

  function openBrandSearch(currentBrand: string, onSelect: (brand: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '브랜드',
      suggestions: brandNames ?? [],
      currentName: currentBrand,
    });
  }

  const openAmountCalculator = useOpenAmountCalculator();

  return (
    <IngredientEditScreen
      onOpenAmountCalculator={openAmountCalculator}
      onClose={pop}
      householdId={params.householdId}
      ingredient={params.ingredient}
      onOpenProductNameSearch={openProductNameSearch}
      onOpenBrandSearch={openBrandSearch}
    />
  );
}

function MealEditorActivity({
  params,
}: {
  params: {
    householdId: string;
    date: string;
    type: MealType;
    meal: Meal | null;
  };
}) {
  const { pop, push } = useActions();

  function openFridgeItemSearch(
    items: FridgeItemSearchOption[],
    onSelectId: (fridgeItemId: string) => void,
  ) {
    setPendingFridgeItemCallback(onSelectId);
    push('FridgeItemSearchActivity', {
      fieldLabel: '재료',
      items,
    });
  }

  function openFridgeBatchSelect(
    batches: FridgeBatchSelectOption[],
    unit: IngredientUnit,
    onSelectBatchId: (batchId: string) => void,
  ) {
    setPendingFridgeBatchCallback(onSelectBatchId);
    push('FridgeBatchSelectActivity', {
      batches,
      unit,
    });
  }

  return (
    <MealEditorScreen
      onClose={pop}
      householdId={params.householdId}
      date={params.date}
      type={params.type}
      meal={params.meal}
      onOpenFridgeItemSearch={openFridgeItemSearch}
      onOpenFridgeBatchSelect={openFridgeBatchSelect}
    />
  );
}

function ProfileSettingsActivity() {
  const { pop } = useActions();

  return <ProfileSettingsScreen onClose={pop} />;
}

function SearchSynonymSettingsActivity() {
  const { pop } = useActions();

  return <SearchSynonymSettingsScreen onClose={pop} />;
}

function ProfileEditActivity() {
  const { pop } = useActions();

  return <ProfileEditScreen onClose={pop} />;
}

function NotificationActivity() {
  return <NotificationScreen />;
}

function NotificationSettingsActivity() {
  const { pop } = useActions();

  return <NotificationSettingsScreen onClose={pop} />;
}

function PromptIngredientAddActivity({
  params,
}: {
  params: {
    householdId: string;
    userId: string;
    suggestions?: string[];
  };
}) {
  const { pop, push } = useActions();

  function handleParsed() {
    push('PromptIngredientStagingActivity', {
      householdId: params.householdId,
      userId: params.userId,
      suggestions: params.suggestions ?? [],
    });
  }

  return (
    <PromptIngredientAddScreen
      onClose={pop}
      onParsed={handleParsed}
      householdId={params.householdId}
    />
  );
}

function PromptIngredientStagingActivity({
  params,
}: {
  params: {
    householdId: string;
    userId: string;
    suggestions?: string[];
  };
}) {
  const { pop, push } = useActions();

  function openEdit(item: StagedItem) {
    push('PromptIngredientStagingEditActivity', {
      householdId: params.householdId,
      userId: params.userId,
      item,
      suggestions: params.suggestions ?? [],
    });
  }

  return (
    <PromptIngredientStagingScreen
      onClose={pop}
      onComplete={() => pop(2)}
      householdId={params.householdId}
      userId={params.userId}
      onEditItem={openEdit}
    />
  );
}

function PromptIngredientStagingEditActivity({
  params,
}: {
  params: {
    householdId: string;
    userId: string;
    item: StagedItem;
    suggestions?: string[];
  };
}) {
  const { pop, push } = useActions();
  const { data: brandNames } = useIngredientBrandNamesQuery(params.householdId);

  function openProductNameSearch(currentName: string, onSelect: (name: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '품목명',
      suggestions: params.suggestions ?? [],
      currentName,
    });
  }

  function openBrandSearch(currentBrand: string, onSelect: (brand: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '브랜드',
      suggestions: brandNames ?? [],
      currentName: currentBrand,
    });
  }

  const openAmountCalculator = useOpenAmountCalculator();

  return (
    <PromptIngredientStagingEditScreen
      onOpenAmountCalculator={openAmountCalculator}
      onClose={pop}
      item={params.item}
      householdId={params.householdId}
      onOpenProductNameSearch={openProductNameSearch}
      onOpenBrandSearch={openBrandSearch}
    />
  );
}

function FoodExpenseSearchActivity({
  params,
}: {
  params: {
    householdId: string;
  };
}) {
  const { pop, push } = useActions();

  // 통합 검색 결과는 장보기와 외식비가 섞여 있어, 종류에 맞는 편집 화면으로 갈라 보낸다.
  function selectExpense(expense: FoodExpense) {
    const ingredient = toIngredient(expense);
    if (ingredient) {
      push('IngredientEditActivity', {
        householdId: params.householdId,
        ingredient,
        suggestions: [],
      });
      return;
    }

    const diningExpense = toDiningExpense(expense);
    if (diningExpense) {
      push('DiningExpenseEditActivity', {
        householdId: params.householdId,
        expense: diningExpense,
      });
    }
  }

  return (
    <FoodExpenseSearchScreen
      onClose={pop}
      householdId={params.householdId}
      onExpenseSelect={selectExpense}
    />
  );
}

function BudgetActivity({
  params,
}: {
  params: {
    householdId: string;
    yearMonth: string;
  };
}) {
  const { pop, push } = useActions();

  function openEdit() {
    push('BudgetEditActivity', {
      householdId: params.householdId,
      yearMonth: params.yearMonth,
    });
  }

  return (
    <BudgetScreen
      onClose={pop}
      onOpenEdit={openEdit}
      householdId={params.householdId}
      yearMonth={params.yearMonth}
    />
  );
}

function BudgetEditActivity({
  params,
}: {
  params: {
    householdId: string;
    yearMonth: string;
  };
}) {
  const { pop } = useActions();

  const openAmountCalculator = useOpenAmountCalculator();

  return (
    <BudgetEditScreen
      onClose={pop}
      onOpenAmountCalculator={openAmountCalculator}
      householdId={params.householdId}
      yearMonth={params.yearMonth}
    />
  );
}

/** 장보기 한 줄을 영수증 항목 편집 화면이 받는 모양으로 바꾼다 */
function toStagedItem(purchase: ParsedPurchase, date: string): StagedItem {
  return {
    id: 'voice-purchase',
    name: purchase.name,
    brand: purchase.brand,
    price: purchase.price,
    count: purchase.count,
    unit: purchase.unit,
    store: purchase.store ?? '',
    date,
    category_code: '',
    category_id: purchase.category_id,
    expiry_date: purchase.expiry_date,
    batches: purchase.batches,
  };
}

/** 외식비를 식비 내역 줄(FoodExpenseItem)이 받는 모양으로 바꾼다 */
function toFoodExpense(expense: ParsedExpense, householdId: string): FoodExpense {
  return {
    id: 'voice-expense',
    household_id: householdId,
    user_id: null,
    kind: expense.kind,
    date: expense.date,
    name: expense.name || null,
    brand: expense.brand || null,
    store: expense.store || null,
    price: expense.price,
    category_id: null,
    count: null,
    unit: null,
    linked_fridge_item_id: null,
    memo: expense.memo ?? null,
    created_at: '',
    updated_at: '',
  };
}

/**
 * 음성 기록 결과 확인 — 식단은 식단 탭 끼니 카드, 장보기는 영수증 추가 목록 줄, 외식비는 식비 내역 줄로 보여 주고
 * 누르면 각각 식단 수정, 영수증 항목 편집, 외식비 입력과 같은 화면을 연다. 고친 값은 결과 화면으로 돌아온다.
 */
function VoiceMealResultActivity({
  params,
}: {
  params: {
    householdId: string;
  };
}) {
  const { pop, push } = useActions();
  const { data: categories = [] } = useIngredientCategoriesQuery(params.householdId);

  const adapters: VoiceResultAdapters = {
    renderMealCard: ({ title, dishes, onPress }) => (
      <MealDraftCard
        householdId={params.householdId}
        title={title}
        dishes={dishes}
        onPress={onPress}
      />
    ),
    renderPurchaseItem: ({ purchase }) => {
      const category = categories.find((candidate) => candidate.id === purchase.category_id);
      return (
        <IngredientItem
          name={purchase.name}
          brand={purchase.brand}
          price={purchase.price}
          count={purchase.count}
          unit={purchase.unit}
          store={purchase.store ?? ''}
          categoryLabel={category?.label ?? '기타'}
          categoryEmoji={category?.emoji}
          size="sm"
        />
      );
    },
    renderExpenseItem: ({ expense }) => (
      <FoodExpenseItem expense={toFoodExpense(expense, params.householdId)} size="sm" />
    ),
    editDishes: ({ title, dishes, onDone }) => {
      setPendingVoiceDishesCallback(onDone);
      push('VoiceMealDraftEditorActivity', { householdId: params.householdId, title, dishes });
    },
    editPurchase: ({ purchase, date, onDone }) => {
      setPendingPromptEditCallback((updates) =>
        onDone({
          ...purchase,
          name: updates.name ?? purchase.name,
          brand: updates.brand ?? purchase.brand,
          price: updates.price ?? purchase.price,
          count: updates.count ?? purchase.count,
          unit: updates.unit ?? purchase.unit,
          store: updates.store ?? purchase.store,
          category_id: updates.category_id ?? purchase.category_id,
          expiry_date: 'expiry_date' in updates ? updates.expiry_date : purchase.expiry_date,
          batches: updates.batches ?? purchase.batches,
        }),
      );
      push('PromptIngredientStagingEditActivity', {
        householdId: params.householdId,
        userId: '',
        item: toStagedItem(purchase, date),
        suggestions: [],
      });
    },
    editExpense: ({ expense, onDone }) => {
      setPendingVoiceExpenseCallback((values) =>
        onDone({
          ...expense,
          kind: values.kind,
          brand: values.brand,
          name: values.name,
          store: values.kind === 'delivery' ? values.store : '',
          price: values.price,
          date: values.date,
          memo: values.memo,
        }),
      );
      push('VoiceDiningExpenseDraftActivity', {
        householdId: params.householdId,
        expense: {
          date: expense.date,
          kind: expense.kind,
          brand: expense.brand,
          name: expense.name,
          store: expense.store,
          price: expense.price,
          memo: expense.memo ?? '',
        },
      });
    },
  };

  return (
    <VoiceMealResultScreen householdId={params.householdId} onClose={pop} adapters={adapters} />
  );
}

/** 음성 기록 결과의 식단을 식단 수정 화면과 같은 메뉴 카드로 고친다 */
function VoiceMealDraftEditorActivity({
  params,
}: {
  params: {
    householdId: string;
    title: string;
    dishes: Parameters<typeof resolvePendingVoiceDishesCallback>[0];
  };
}) {
  const { pop, push } = useActions();

  function openFridgeItemSearch(
    items: FridgeItemSearchOption[],
    onSelectId: (fridgeItemId: string) => void,
  ) {
    setPendingFridgeItemCallback(onSelectId);
    push('FridgeItemSearchActivity', { fieldLabel: '재료', items });
  }

  function openFridgeBatchSelect(
    batches: FridgeBatchSelectOption[],
    unit: IngredientUnit,
    onSelectBatchId: (batchId: string) => void,
  ) {
    setPendingFridgeBatchCallback(onSelectBatchId);
    push('FridgeBatchSelectActivity', { batches, unit });
  }

  return (
    <MealDraftEditorScreen
      householdId={params.householdId}
      title={params.title}
      dishes={params.dishes}
      onClose={pop}
      onDone={resolvePendingVoiceDishesCallback}
      onOpenFridgeItemSearch={openFridgeItemSearch}
      onOpenFridgeBatchSelect={openFridgeBatchSelect}
    />
  );
}

/** 음성 기록 결과의 외식비를 외식비 입력 화면과 같은 폼으로 고친다 */
function VoiceDiningExpenseDraftActivity({
  params,
}: {
  params: {
    householdId: string;
    expense: Parameters<typeof resolvePendingVoiceExpenseCallback>[0];
  };
}) {
  const { pop } = useActions();
  const openAmountCalculator = useOpenAmountCalculator();

  return (
    <DiningExpenseDraftScreen
      householdId={params.householdId}
      defaultValues={params.expense}
      onClose={pop}
      onDone={resolvePendingVoiceExpenseCallback}
      onOpenAmountCalculator={openAmountCalculator}
    />
  );
}

function DiningExpenseAddActivity({
  params,
}: {
  params: {
    householdId: string;
  };
}) {
  const { pop } = useActions();

  const openAmountCalculator = useOpenAmountCalculator();

  return (
    <DiningExpenseAddScreen
      onClose={pop}
      onOpenAmountCalculator={openAmountCalculator}
      householdId={params.householdId}
    />
  );
}

function DiningExpenseEditActivity({
  params,
}: {
  params: {
    householdId: string;
    expense: DiningExpense;
  };
}) {
  const { pop } = useActions();

  const openAmountCalculator = useOpenAmountCalculator();

  return (
    <DiningExpenseEditScreen
      onOpenAmountCalculator={openAmountCalculator}
      onClose={pop}
      householdId={params.householdId}
      expense={params.expense}
    />
  );
}

function AmountCalculatorActivity({
  params,
}: {
  params: {
    title: string;
    // 새로고침으로 URL에서 복원되면 문자열로 들어온다
    value?: number | string;
    nullable?: boolean | string;
  };
}) {
  const { pop } = useActions();
  const hasLeftRef = useRef(false);

  // 닫히는 전환 중에도 화면이 살아 있어, 다시 입력되면 아래 폼까지 pop되지 않게 한 번만 처리한다
  function leaveOnce(settlePendingCallback: () => void) {
    if (hasLeftRef.current) return;
    hasLeftRef.current = true;
    settlePendingCallback();
    pop();
  }

  function handleConfirm(nextValue: number | null) {
    leaveOnce(() => resolvePendingAmountCalculatorCallback(nextValue));
  }

  function handleClose() {
    leaveOnce(clearPendingAmountCalculatorCallback);
  }

  return (
    <AmountCalculatorScreen
      title={params.title}
      value={parseCalculatorAmount(params.value)}
      nullable={parseCalculatorNullable(params.nullable)}
      onClose={handleClose}
      onConfirm={handleConfirm}
    />
  );
}

function ProductNameSearchActivity({
  params,
}: {
  params: {
    fieldLabel?: string;
    suggestions?: string[];
    depletedNames?: string[];
    currentName?: string;
  };
}) {
  const { pop } = useActions();

  function handleSelectName(name: string) {
    resolvePendingProductNameCallback(name);
    pop();
  }

  function handleClose() {
    clearPendingProductNameCallback();
    pop();
  }

  return (
    <ProductNameSearchScreen
      onClose={handleClose}
      onSelectName={handleSelectName}
      fieldLabel={params.fieldLabel}
      suggestions={params.suggestions}
      depletedNames={params.depletedNames}
      defaultQuery={params.currentName}
    />
  );
}

function FridgeItemSearchActivity({
  params,
}: {
  params: {
    fieldLabel?: string;
    items?: FridgeItemSearchOption[];
  };
}) {
  const { pop } = useActions();

  function handleSelectItem(fridgeItemId: string) {
    resolvePendingFridgeItemCallback(fridgeItemId);
    pop();
  }

  function handleClose() {
    clearPendingFridgeItemCallback();
    pop();
  }

  return (
    <FridgeItemSearchScreen
      onClose={handleClose}
      onSelectItem={handleSelectItem}
      fieldLabel={params.fieldLabel}
      items={params.items}
    />
  );
}

function FridgeBatchSelectActivity({
  params,
}: {
  params: {
    batches?: FridgeBatchSelectOption[];
    unit?: IngredientUnit;
  };
}) {
  const { pop } = useActions();

  function handleSelectBatch(batchId: string) {
    resolvePendingFridgeBatchCallback(batchId);
    pop();
  }

  function handleClose() {
    clearPendingFridgeBatchCallback();
    pop();
  }

  return (
    <FridgeBatchSelectScreen
      onClose={handleClose}
      onSelectBatch={handleSelectBatch}
      batches={params.batches}
      unit={params.unit}
    />
  );
}

const appStackFlow = stackflow({
  transitionDuration: 360,
  initialActivity: () => 'IdleActivity',
  activities: {
    IdleActivity,
    PlaceholderActivity,
    IngredientAddActivity,
    IngredientEditActivity,
    FoodExpenseSearchActivity,
    DiningExpenseAddActivity,
    DiningExpenseEditActivity,
    BudgetActivity,
    BudgetEditActivity,
    FridgeItemAddActivity,
    FridgeItemEditActivity,
    FridgeItemSubdivideActivity,
    FridgeBatchEditActivity,
    FridgeFilterSettingsActivity,
    FridgeExpiryListActivity,
    MealEditorActivity,
    VoiceMealResultActivity,
    VoiceMealDraftEditorActivity,
    VoiceDiningExpenseDraftActivity,
    NotificationActivity,
    NotificationSettingsActivity,
    ProfileSettingsActivity,
    SearchSynonymSettingsActivity,
    ProfileEditActivity,
    AmountCalculatorActivity,
    ProductNameSearchActivity,
    FridgeItemSearchActivity,
    FridgeBatchSelectActivity,
    PromptIngredientAddActivity,
    PromptIngredientStagingActivity,
    PromptIngredientStagingEditActivity,
  },
  plugins: [
    basicRendererPlugin(),
    historySyncPlugin({
      routes: {
        IdleActivity: '/idle',
        PlaceholderActivity: '/placeholder',
        IngredientAddActivity: '/ingredient/add',
        IngredientEditActivity: '/ingredient/edit',
        FoodExpenseSearchActivity: '/food-expense/search',
        DiningExpenseAddActivity: '/dining/add',
        DiningExpenseEditActivity: '/dining/edit',
        BudgetActivity: '/budget',
        BudgetEditActivity: '/budget/edit',
        FridgeItemAddActivity: '/fridge/item/add',
        FridgeItemEditActivity: '/fridge/item/edit',
        FridgeItemSubdivideActivity: '/fridge/item/subdivide',
        FridgeBatchEditActivity: '/fridge/batch/edit',
        FridgeFilterSettingsActivity: '/fridge/filter/settings',
        FridgeExpiryListActivity: '/fridge/expiry',
        MealEditorActivity: '/meal/editor',
        VoiceMealResultActivity: '/meal/voice-result',
        VoiceMealDraftEditorActivity: '/meal/voice-result/meal',
        VoiceDiningExpenseDraftActivity: '/meal/voice-result/dining-expense',
        NotificationActivity: '/notifications',
        NotificationSettingsActivity: '/notifications/settings',
        ProfileSettingsActivity: '/profile/settings',
        SearchSynonymSettingsActivity: '/search/synonym/settings',
        ProfileEditActivity: '/profile/edit',
        AmountCalculatorActivity: '/amount/calculator',
        ProductNameSearchActivity: '/search/product-name',
        FridgeItemSearchActivity: '/search/fridge-item',
        FridgeBatchSelectActivity: '/search/fridge-batch',
        PromptIngredientAddActivity: '/ingredient/ai/add',
        PromptIngredientStagingActivity: '/ingredient/ai/staging',
        PromptIngredientStagingEditActivity: '/ingredient/ai/staging/edit',
      },
      fallbackActivity: () => 'IdleActivity',
      useHash: true,
    }),
    basicUIPlugin({
      theme: 'cupertino',
      rootClassName: 'stackflow-root absolute inset-0 z-[var(--z-stackflow)]',
    }),
  ],
});

export const {
  Stack: StackFlowStack,
  useFlow: useStackFlow,
  actions: stackFlowActions,
} = appStackFlow;
