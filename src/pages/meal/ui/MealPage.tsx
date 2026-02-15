'use client';

import { useMemo, useState } from 'react';

import { addDays, format, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, PencilLine } from 'lucide-react';

import { stackFlowActions } from '@/apps/stackflow/StackFlow';

import { Button, Card } from '@/commons/ui';

import { type Meal, type MealType } from '@/entities/meal';

import { useMealsByDateQuery } from '@/features/meal-manager';

import { MainAppBar } from '@/modules/main-app-bar';

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

export function MealPage({ householdId }: MealPageProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const { data: meals = [], isLoading } = useMealsByDateQuery(householdId, dateKey);

  const mealMap = useMemo(() => {
    return new Map(meals.map((meal) => [meal.type, meal]));
  }, [meals]);

  const openEditor = (type: MealType) => {
    const meal = (mealMap.get(type) ?? null) as Meal | null;
    stackFlowActions.push('MealEditorActivity', { householdId, date: dateKey, type, meal });
  };

  return (
    <div className="flex flex-col gap-4 px-4 pb-5">
      <MainAppBar
        title="식단"
        right={
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
            오늘
          </Button>
        }
      />

      <section className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setSelectedDate((d) => subDays(d, 1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="text-base font-bold">
          {format(selectedDate, 'M월 d일 EEEE', { locale: ko })}
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setSelectedDate((d) => addDays(d, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </section>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">불러오는 중...</div>
      ) : (
        <section className="space-y-3">
          {MEAL_TYPE_ORDER.map((type) => {
            const meal = mealMap.get(type);

            return (
              <Card key={type}>
                <Card.Header className="flex flex-row items-center justify-between">
                  <h2 className="text-sm font-semibold">{MEAL_TYPE_LABEL[type]}</h2>
                  <Button variant="outline" size="sm" onClick={() => openEditor(type)}>
                    <PencilLine className="mr-1 size-4" /> 편집
                  </Button>
                </Card.Header>
                <Card.Content>
                  {!meal || meal.dishes.length === 0 ? (
                    <p className="text-sm text-gray-400">아직 등록된 메뉴가 없습니다</p>
                  ) : (
                    <ul className="space-y-2">
                      {meal.dishes
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((dish) => (
                          <li key={dish.id} className="rounded-md bg-gray-50 px-3 py-2 text-sm">
                            <p className="font-medium">{dish.name}</p>
                            {dish.ingredients.length > 0 && (
                              <p className="mt-1 text-xs text-gray-500">
                                재료 {dish.ingredients.length}개 연결됨
                              </p>
                            )}
                          </li>
                        ))}
                    </ul>
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
