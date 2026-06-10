'use client';

import { useState } from 'react';

import { format } from 'date-fns';

import { stackFlowActions } from '@/apps/stackflow/StackFlow';

import { type Meal, type MealType } from '@/entities/meal';

import { MealCardList, MealDateStrip } from '@/features/meal';

interface MealPageProps {
  householdId: string;
}

export function MealPage({ householdId }: MealPageProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const dateKey = format(selectedDate, 'yyyy-MM-dd');

  const openEditor = (type: MealType, meal: Meal | null) => {
    stackFlowActions.push('MealEditorActivity', { householdId, date: dateKey, type, meal });
  };

  return (
    <div className="flex flex-col gap-4 px-4 pb-5">
      <MealDateStrip
        householdId={householdId}
        selectedDate={selectedDate}
        onSelectedDateChange={setSelectedDate}
      />
      <MealCardList
        householdId={householdId}
        selectedDate={selectedDate}
        onSelectedDateChange={setSelectedDate}
        onMealOpen={openEditor}
      />
    </div>
  );
}
