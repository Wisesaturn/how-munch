'use client';

import { useMemo, useState } from 'react';

import { addDays, format, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, PencilLine, Plus, Trash2 } from 'lucide-react';

import { stackFlowActions } from '@/apps/stackflow/StackFlow';

import { Button, Card, Toast } from '@/commons/ui';

import { type Meal, type MealType } from '@/entities/meal';

import { useDeleteMealMutation, useMealsByDateQuery } from '@/features/meal-manager';

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
  const deleteMealMutation = useDeleteMealMutation();

  const mealMap = useMemo(() => {
    return new Map(meals.map((meal) => [meal.type, meal]));
  }, [meals]);

  const openEditor = (type: MealType) => {
    const meal = (mealMap.get(type) ?? null) as Meal | null;
    stackFlowActions.push('MealEditorActivity', { householdId, date: dateKey, type, meal });
  };

  const deleteMeal = (mealId: string) => {
    deleteMealMutation.mutate(
      { id: mealId, householdId, date: dateKey },
      {
        onSuccess: () => {
          Toast.success('식단이 삭제되었습니다');
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : '식단 삭제에 실패했습니다';
          Toast.error(message);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-4 px-4 pb-5">
      <section className="flex items-center justify-between">
        <div className="flex items-center gap-2">
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
        </div>
        <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
          오늘
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
                  {meal ? (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditor(type)}>
                        <PencilLine className="mr-1 size-4" /> 편집
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={deleteMealMutation.isPending}
                        onClick={() => {
                          if (!window.confirm('식단을 삭제하시겠습니까?')) return;
                          deleteMeal(meal.id);
                        }}
                      >
                        <Trash2 className="mr-1 size-4" /> 삭제
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => openEditor(type)}>
                      <Plus className="mr-1 size-4" /> 추가
                    </Button>
                  )}
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
