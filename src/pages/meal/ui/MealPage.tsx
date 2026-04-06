'use client';

import { useMemo, useState } from 'react';

import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import { addDays, format, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightSmall,
  UtensilsCrossed,
} from 'lucide-react';
import { useConditionalEffect } from 'react-simplikit';

import { stackFlowActions } from '@/apps/stackflow/StackFlow';

import { cn } from '@/commons/lib';
import { Badge, Button, Card, EmptyState, Toast } from '@/commons/ui';

import { type Dish, type Meal, type MealType } from '@/entities/meal';

import { MealDishMoveButton, useMealsByDateQuery, useReorderDishesMutation } from '@/features/meal';

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

type MealDishesMap = Map<MealType, Dish[]>;

function buildSortedDishesMap(meals: Meal[]): MealDishesMap {
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

  const serverDishesMap = useMemo(() => buildSortedDishesMap(meals), [meals]);

  const [localDishesMap, setLocalDishesMap] = useState<MealDishesMap>(() =>
    buildSortedDishesMap(meals),
  );

  const dishesMap = useMemo(() => {
    const merged = new Map(serverDishesMap);
    for (const [type, dishes] of localDishesMap) {
      merged.set(type, dishes);
    }
    return merged;
  }, [serverDishesMap, localDishesMap]);

  useConditionalEffect(
    function resetLocalDishesOnDateChange() {
      setLocalDishesMap(new Map());
    },
    [dateKey],
    (prev, next) => prev?.[0] !== next?.[0],
  );

  const reorderMutation = useReorderDishesMutation();

  const openEditor = (type: MealType) => {
    const meal = (mealMap.get(type) ?? null) as Meal | null;
    stackFlowActions.push('MealEditorActivity', { householdId, date: dateKey, type, meal });
  };

  function onDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination) return;
    if (source.index === destination.index && source.droppableId === destination.droppableId) {
      return;
    }

    const mealType = source.droppableId as MealType;
    const currentDishes = dishesMap.get(mealType) ?? [];
    const reordered = [...currentDishes];
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);

    const updatedDishes = reordered.map((dish, index) => ({ ...dish, sort_order: index }));
    setLocalDishesMap((prev) => {
      const next = new Map(prev);
      next.set(mealType, updatedDishes);
      return next;
    });

    const updates = updatedDishes.map((dish) => ({
      dish_id: dish.id,
      sort_order: dish.sort_order,
    }));

    reorderMutation.mutate(
      { householdId, date: dateKey, updates },
      {
        onError: () => {
          setLocalDishesMap(new Map(serverDishesMap));
          Toast.error('순서 변경에 실패했습니다');
        },
      },
    );
  }

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
            <ChevronRightSmall className="size-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
          오늘
        </Button>
      </section>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">불러오는 중...</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
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
                      <Droppable droppableId={type}>
                        {(droppableProvided) => (
                          <ul
                            ref={droppableProvided.innerRef}
                            {...droppableProvided.droppableProps}
                            className="space-y-2"
                          >
                            {dishes.map((dish, index) => (
                              <Draggable key={dish.id} draggableId={dish.id} index={index}>
                                {(draggableProvided, snapshot) => (
                                  <li
                                    ref={draggableProvided.innerRef}
                                    {...draggableProvided.draggableProps}
                                    className={cn(
                                      'rounded-md bg-gray-50 px-3 py-2 text-sm transition-shadow',
                                      snapshot.isDragging && 'shadow-md',
                                    )}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center justify-between">
                                      <p className="font-medium">{dish.name}</p>
                                      <div className="flex items-center gap-1.5">
                                        {dish.ingredients.length > 0 && (
                                          <Badge variant="secondary">
                                            재료 {dish.ingredients.length}
                                          </Badge>
                                        )}
                                        <MealDishMoveButton
                                          dragHandleProps={draggableProvided.dragHandleProps}
                                        />
                                      </div>
                                    </div>
                                  </li>
                                )}
                              </Draggable>
                            ))}
                            {droppableProvided.placeholder}
                          </ul>
                        )}
                      </Droppable>
                    )}
                  </Card.Content>
                </Card>
              );
            })}
          </section>
        </DragDropContext>
      )}
    </div>
  );
}
