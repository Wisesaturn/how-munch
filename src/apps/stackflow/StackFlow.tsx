'use client';

import { basicUIPlugin } from '@stackflow/plugin-basic-ui';
import { historySyncPlugin } from '@stackflow/plugin-history-sync';
import { basicRendererPlugin } from '@stackflow/plugin-renderer-basic';
import { useActions, useActivity, stackflow } from '@stackflow/react';

import { type Ingredient, type IngredientUnit } from '@/entities/ingredient';
import { type FridgeItemBatch, type FridgeItemWithBatches } from '@/entities/fridge-item';
import { type Meal, type MealType } from '@/entities/meal';

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
  IngredientSearchScreen,
  ProductNameSearchScreen,
  resolvePendingProductNameCallback,
  setPendingProductNameCallback,
  type StagedItem,
  useIngredientBrandNamesQuery,
} from '@/features/ingredient';
import { MealEditorScreen } from '@/features/meal';
import { NotificationScreen, NotificationSettingsScreen } from '@/features/notification';
import { ProfileEditScreen, ProfileSettingsScreen } from '@/features/profile';

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

  function openProductNameSearch(_currentName: string, onSelect: (name: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '품목명',
      suggestions: params.suggestions ?? [],
    });
  }

  function openBrandSearch(_currentBrand: string, onSelect: (brand: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '브랜드',
      suggestions: brandNames ?? [],
    });
  }

  return (
    <IngredientAddScreen
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

  function openProductNameSearch(_currentName: string, onSelect: (name: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '재료명',
      suggestions: params.suggestions ?? [],
    });
  }

  function openBrandSearch(_currentBrand: string, onSelect: (brand: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '브랜드',
      suggestions: brandNames ?? [],
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

  function openProductNameSearch(_currentName: string, onSelect: (name: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '재료명',
      suggestions: params.suggestions ?? [],
    });
  }

  function openBrandSearch(_currentBrand: string, onSelect: (brand: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '브랜드',
      suggestions: brandNames ?? [],
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
    fromStore: boolean;
  };
}) {
  const { pop } = useActions();

  return (
    <FridgeBatchEditScreen
      onClose={pop}
      batch={params.batch}
      unit={params.unit}
      fromStore={params.fromStore}
    />
  );
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

  function openProductNameSearch(_currentName: string, onSelect: (name: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '품목명',
      suggestions: params.suggestions ?? [],
    });
  }

  function openBrandSearch(_currentBrand: string, onSelect: (brand: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '브랜드',
      suggestions: brandNames ?? [],
    });
  }

  return (
    <IngredientEditScreen
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
    suggestions: string[],
    depletedNames: string[],
    onSelectName: (name: string) => void,
  ) {
    setPendingProductNameCallback(onSelectName);
    push('ProductNameSearchActivity', {
      fieldLabel: '재료',
      suggestions,
      depletedNames,
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
    />
  );
}

function ProfileSettingsActivity() {
  const { pop } = useActions();

  return <ProfileSettingsScreen onClose={pop} />;
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
  };
}) {
  const { pop, push } = useActions();

  function handleParsed() {
    push('PromptIngredientStagingActivity', {
      householdId: params.householdId,
      userId: params.userId,
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
  };
}) {
  const { pop, push } = useActions();

  function openEdit(item: StagedItem) {
    push('PromptIngredientStagingEditActivity', {
      householdId: params.householdId,
      userId: params.userId,
      item,
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
  };
}) {
  const { pop } = useActions();

  return (
    <PromptIngredientStagingEditScreen
      onClose={pop}
      item={params.item}
      householdId={params.householdId}
    />
  );
}

function IngredientSearchActivity({
  params,
}: {
  params: {
    householdId: string;
  };
}) {
  const { pop, push } = useActions();

  function selectIngredient(ingredient: Ingredient) {
    push('IngredientEditActivity', {
      householdId: params.householdId,
      ingredient,
      suggestions: [],
    });
  }

  return (
    <IngredientSearchScreen
      onClose={pop}
      householdId={params.householdId}
      onIngredientSelect={selectIngredient}
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
    IngredientSearchActivity,
    FridgeItemAddActivity,
    FridgeItemEditActivity,
    FridgeItemSubdivideActivity,
    FridgeBatchEditActivity,
    FridgeFilterSettingsActivity,
    FridgeExpiryListActivity,
    MealEditorActivity,
    NotificationActivity,
    NotificationSettingsActivity,
    ProfileSettingsActivity,
    ProfileEditActivity,
    ProductNameSearchActivity,
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
        IngredientSearchActivity: '/ingredient/search',
        FridgeItemAddActivity: '/fridge/item/add',
        FridgeItemEditActivity: '/fridge/item/edit',
        FridgeItemSubdivideActivity: '/fridge/item/subdivide',
        FridgeBatchEditActivity: '/fridge/batch/edit',
        FridgeFilterSettingsActivity: '/fridge/filter/settings',
        FridgeExpiryListActivity: '/fridge/expiry',
        MealEditorActivity: '/meal/editor',
        NotificationActivity: '/notifications',
        NotificationSettingsActivity: '/notifications/settings',
        ProfileSettingsActivity: '/profile/settings',
        ProfileEditActivity: '/profile/edit',
        ProductNameSearchActivity: '/search/product-name',
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
