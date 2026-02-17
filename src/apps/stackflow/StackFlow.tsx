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
  FridgeItemAddScreen,
  FridgeItemEditScreen,
} from '@/features/fridge';
import { IngredientAddScreen, IngredientEditScreen } from '@/features/ingredient';
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
  };
}) {
  const { pop } = useActions();

  return (
    <IngredientAddScreen
      onClose={pop}
      householdId={params.householdId}
      userId={params.userId}
      defaultName={params.defaultName}
    />
  );
}

function FridgeItemAddActivity({
  params,
}: {
  params: {
    householdId: string;
  };
}) {
  const { pop } = useActions();

  return <FridgeItemAddScreen onClose={pop} householdId={params.householdId} />;
}

function FridgeItemEditActivity({
  params,
}: {
  params: {
    item: FridgeItemWithBatches;
  };
}) {
  const { pop } = useActions();

  return <FridgeItemEditScreen onClose={pop} item={params.item} />;
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

function IngredientEditActivity({
  params,
}: {
  params: {
    householdId: string;
    ingredient: Ingredient;
  };
}) {
  const { pop } = useActions();

  return (
    <IngredientEditScreen
      onClose={pop}
      householdId={params.householdId}
      ingredient={params.ingredient}
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
  const { pop } = useActions();

  return (
    <MealEditorScreen
      onClose={pop}
      householdId={params.householdId}
      date={params.date}
      type={params.type}
      meal={params.meal}
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
    MealEditorActivity,
    NotificationActivity,
    NotificationSettingsActivity,
    ProfileSettingsActivity,
    ProfileEditActivity,
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
        MealEditorActivity: '/meal/editor',
        NotificationActivity: '/notifications',
        NotificationSettingsActivity: '/notifications/settings',
        ProfileSettingsActivity: '/profile/settings',
        ProfileEditActivity: '/profile/edit',
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
