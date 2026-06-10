'use client';

import { useMemo, useState } from 'react';

import { addDays, format } from 'date-fns';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion';
import { ChevronRight, UtensilsCrossed } from 'lucide-react';

import { cn } from '@/commons/lib';
import { Card, EmptyState } from '@/commons/ui';

import { type Dish, type Meal, type MealType } from '@/entities/meal';

import { useMealsByDateQuery } from '../api/queries';

import { MealDishList } from './MealDishList';

/* -------------------------------------------------------------------------------------------------
 * Constants & Helpers
 * -----------------------------------------------------------------------------------------------*/

const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const MEAL_TYPE_LABEL: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

/** 일 이동으로 판정하는 드래그 거리(px)/속도(px/s) 임계값 — MealDateStrip과 동일 */
const SWIPE_DISTANCE_THRESHOLD = 48;
const SWIPE_VELOCITY_THRESHOLD = 480;

/** 일 전환 슬라이드 — direction(±1) 기준 진입/이탈 방향, 0이면 페이드만 수행 */
const daySlideVariants = {
  enter: (direction: number) => ({ x: direction * 32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction * -32, opacity: 0 }),
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

/* -------------------------------------------------------------------------------------------------
 * MealCardList
 * -----------------------------------------------------------------------------------------------*/

interface MealCardListProps {
  householdId: string;
  selectedDate: Date;
  /** 카드 영역 좌우 스와이프로 어제/내일 이동 시 호출 */
  onSelectedDateChange: (date: Date) => void;
  onMealOpen: (type: MealType, meal: Meal | null) => void;
}

/** 선택 날짜의 식사 유형별 카드 목록 — 좌우 스와이프로 일 단위 이동을 지원한다 */
export function MealCardList({
  householdId,
  selectedDate,
  onSelectedDateChange,
  onMealOpen,
}: MealCardListProps) {
  const shouldReduceMotion = useReducedMotion();

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const {
    data: meals = [],
    isLoading,
    isPlaceholderData,
  } = useMealsByDateQuery(householdId, dateKey);

  // 날짜 변경 방향 추적 — yyyy-MM-dd 키는 사전순 비교가 시간순 비교와 일치한다
  const [syncedDateKey, setSyncedDateKey] = useState(dateKey);
  const [direction, setDirection] = useState(0);
  if (dateKey !== syncedDateKey) {
    setDirection(dateKey > syncedDateKey ? 1 : -1);
    setSyncedDateKey(dateKey);
  }

  const mealMap = useMemo(() => new Map(meals.map((meal) => [meal.type, meal])), [meals]);
  const dishesMap = useMemo(() => buildSortedDishesMap(meals), [meals]);

  function settleDayDrag(_event: unknown, info: PanInfo) {
    const { offset, velocity } = info;
    if (offset.x < -SWIPE_DISTANCE_THRESHOLD || velocity.x < -SWIPE_VELOCITY_THRESHOLD) {
      onSelectedDateChange(addDays(selectedDate, 1));
      return;
    }
    if (offset.x > SWIPE_DISTANCE_THRESHOLD || velocity.x > SWIPE_VELOCITY_THRESHOLD) {
      onSelectedDateChange(addDays(selectedDate, -1));
    }
  }

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-gray-400">불러오는 중...</div>;
  }

  return (
    <div className="overflow-x-clip">
      <AnimatePresence initial={false} mode="popLayout" custom={shouldReduceMotion ? 0 : direction}>
        <motion.section
          key={dateKey}
          custom={shouldReduceMotion ? 0 : direction}
          variants={daySlideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={settleDayDrag}
          className={cn(
            'touch-pan-y space-y-3 transition-opacity',
            isPlaceholderData && 'opacity-60',
          )}
        >
          {MEAL_TYPE_ORDER.map((type) => {
            const dishes = dishesMap.get(type) ?? [];

            return (
              <Card
                key={type}
                className="cursor-pointer transition-colors active:bg-gray-50"
                onClick={() => onMealOpen(type, mealMap.get(type) ?? null)}
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
        </motion.section>
      </AnimatePresence>
    </div>
  );
}
