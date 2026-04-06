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
} from '@/features/fridge';
import {
  clearPendingProductNameCallback,
  IngredientAddScreen,
  IngredientEditScreen,
  ProductNameSearchScreen,
  resolvePendingProductNameCallback,
  setPendingProductNameCallback,
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

  function openProductNameSearch(_currentName: string, onSelect: (name: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '품목명',
      suggestions: params.suggestions ?? [],
    });
  }

  return (
    <IngredientAddScreen
      onClose={pop}
      householdId={params.householdId}
      userId={params.userId}
      defaultName={params.defaultName}
      onOpenProductNameSearch={openProductNameSearch}
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

  function openProductNameSearch(_currentName: string, onSelect: (name: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '재료명',
      suggestions: params.suggestions ?? [],
    });
  }

  return (
    <FridgeItemAddScreen
      onClose={pop}
      householdId={params.householdId}
      onOpenProductNameSearch={openProductNameSearch}
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

  function openProductNameSearch(_currentName: string, onSelect: (name: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '재료명',
      suggestions: params.suggestions ?? [],
    });
  }

  return (
    <FridgeItemEditScreen
      onClose={pop}
      item={params.item}
      onOpenProductNameSearch={openProductNameSearch}
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

  function openProductNameSearch(_currentName: string, onSelect: (name: string) => void) {
    setPendingProductNameCallback(onSelect);
    push('ProductNameSearchActivity', {
      fieldLabel: '품목명',
      suggestions: params.suggestions ?? [],
    });
  }

  return (
    <IngredientEditScreen
      onClose={pop}
      householdId={params.householdId}
      ingredient={params.ingredient}
      onOpenProductNameSearch={openProductNameSearch}
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
    FridgeItemAddActivity,
    FridgeItemEditActivity,
    FridgeBatchEditActivity,
    FridgeFilterSettingsActivity,
    FridgeExpiryListActivity,
    MealEditorActivity,
    NotificationActivity,
    NotificationSettingsActivity,
    ProfileSettingsActivity,
    ProfileEditActivity,
    ProductNameSearchActivity,
  },
  plugins: [
    basicRendererPlugin(),
    historySyncPlugin({
      routes: {
        IdleActivity: '/idle',
        PlaceholderActivity: '/placeholder',
        IngredientAddActivity: '/ingredient/add',
        IngredientEditActivity: '/ingredient/edit',
        FridgeItemAddActivity: '/fridge/item/add',
        FridgeItemEditActivity: '/fridge/item/edit',
        FridgeBatchEditActivity: '/fridge/batch/edit',
        FridgeFilterSettingsActivity: '/fridge/filter/settings',
        FridgeExpiryListActivity: '/fridge/expiry',
        MealEditorActivity: '/meal/editor',
        NotificationActivity: '/notifications',
        NotificationSettingsActivity: '/notifications/settings',
        ProfileSettingsActivity: '/profile/settings',
        ProfileEditActivity: '/profile/edit',
        ProductNameSearchActivity: '/search/product-name',
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
