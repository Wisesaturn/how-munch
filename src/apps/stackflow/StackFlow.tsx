'use client';

import { basicUIPlugin } from '@stackflow/plugin-basic-ui';
import { historySyncPlugin } from '@stackflow/plugin-history-sync';
import { basicRendererPlugin } from '@stackflow/plugin-renderer-basic';
import { useActions, stackflow } from '@stackflow/react';

import { type Meal, type MealType } from '@/entities/meal';

import { FridgeItemAddScreen } from '@/features/fridge-manager';
import { IngredientAddScreen } from '@/features/ingredient';
import { MealEditorScreen } from '@/features/meal-manager';

function IdleActivity() {
  return null;
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

const appStackFlow = stackflow({
  transitionDuration: 240,
  initialActivity: () => 'IdleActivity',
  activities: {
    IdleActivity,
    PlaceholderActivity,
    IngredientAddActivity,
    FridgeItemAddActivity,
    MealEditorActivity,
  },
  plugins: [
    basicRendererPlugin(),
    historySyncPlugin({
      routes: {
        IdleActivity: '/idle',
        PlaceholderActivity: '/placeholder',
        IngredientAddActivity: '/ingredient/add',
        FridgeItemAddActivity: '/fridge/item/add',
        MealEditorActivity: '/meal/editor',
      },
      fallbackActivity: () => 'IdleActivity',
      useHash: true,
    }),
    basicUIPlugin({
      theme: 'cupertino',
      rootClassName: 'pointer-events-none absolute inset-0 z-[60]',
    }),
  ],
});

export const {
  Stack: StackFlowStack,
  useFlow: useStackFlow,
  actions: stackFlowActions,
} = appStackFlow;
