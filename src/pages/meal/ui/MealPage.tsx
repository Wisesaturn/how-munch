'use client';

import { useMemo, useState } from 'react';

import { format } from 'date-fns';
import { ChevronRight, UtensilsCrossed } from 'lucide-react';

import { stackFlowActions } from '@/apps/stackflow/StackFlow';

import { Card, EmptyState } from '@/commons/ui';

import { type Dish, type Meal, type MealType } from '@/entities/meal';

import { MealDateStrip, MealDishList, useMealsByDateQuery } from '@/features/meal';

interface MealPageProps {
  householdId: string;
}

const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const MEAL_TYPE_LABEL: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

function buildSortedDishesMap(meals: Meal[]): Map<MealType, Dish[]> {
  const map = new Map<MealType, Dish[]>();
  for (const meal of meals) {
    map.set(
      meal.type,
      [...meal.dishes].sort((a, b) => a.sort_order - b.sort_order),
    );
  }
  return map;
}

export function MealPage({ householdId }: MealPageProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const { data: meals = [], isLoading } = useMealsByDateQuery(householdId, dateKey);

  const mealMap = useMemo(() => {
    return new Map(meals.map((meal) => [meal.type, meal]));
  }, [meals]);

  const dishesMap = useMemo(() => buildSortedDishesMap(meals), [meals]);

  const openEditor = (type: MealType) => {
    const meal = (mealMap.get(type) ?? null) as Meal | null;
    stackFlowActions.push('MealEditorActivity', { householdId, date: dateKey, type, meal });
  };

  return (
    <div className="flex flex-col gap-4 px-4 pb-5">
      <MealDateStrip
        householdId={householdId}
        selectedDate={selectedDate}
        onSelectedDateChange={setSelectedDate}
      />

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">불러오는 중...</div>
      ) : (
        <section className="space-y-3">
          {MEAL_TYPE_ORDER.map((type) => {
            const dishes = dishesMap.get(type) ?? [];

            return (
              <Card
                key={type}
                className="cursor-pointer transition-colors active:bg-gray-50"
                onClick={() => openEditor(type)}
              >
                <Card.Header className="flex flex-row items-center justify-between">
                  <h2 className="text-sm font-semibold">{MEAL_TYPE_LABEL[type]}</h2>
                  <ChevronRight className="size-4 text-gray-400" />
                </Card.Header>
                <Card.Content>
                  {dishes.length === 0 ? (
                    <EmptyState.Root>
                      <EmptyState.Content className="py-6">
                        <EmptyState.Indicator>
                          <UtensilsCrossed className="size-5" />
                        </EmptyState.Indicator>
                        <EmptyState.Title>등록된 메뉴가 없습니다</EmptyState.Title>
                        <EmptyState.Description>탭하여 메뉴를 추가하세요</EmptyState.Description>
                      </EmptyState.Content>
                    </EmptyState.Root>
                  ) : (
                    <MealDishList householdId={householdId} dishes={dishes} />
                  )}
                </Card.Content>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}
