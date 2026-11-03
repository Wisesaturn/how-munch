'use client';

import { ChevronRight, UtensilsCrossed } from 'lucide-react';

import { Card, EmptyState } from '@/commons/ui';

import { useFridgeItemsForMealQuery } from '../api/queries';
import { type EditorDish } from '../lib';

interface MealDraftCardProps {
  householdId: string;
  /** 카드 머리에 보일 끼니 이름 (아침, 점심, 저녁, 간식) */
  title: string;
  dishes: EditorDish[];
  onPress: () => void;
}

/**
 * 아직 저장하지 않은 메뉴를 식단 탭의 끼니 카드와 같은 모양으로 보여 준다.
 * 저장 전이라 재료 이름은 냉장고 품목 목록에서 찾아 붙인다.
 */
export function MealDraftCard({ householdId, title, dishes, onPress }: MealDraftCardProps) {
  const fridgeItemIds = dishes.flatMap((dish) =>
    dish.ingredients.map((ingredient) => ingredient.fridge_item_id),
  );
  const { data: fridgeItems = [] } = useFridgeItemsForMealQuery(householdId, fridgeItemIds);
  const nameById = new Map(fridgeItems.map((item) => [item.id, item.name]));
  const visibleDishes = dishes.filter((dish) => dish.name.trim() || dish.ingredients.length > 0);

  return (
    <Card className="cursor-pointer transition-colors active:bg-gray-50" onClick={onPress}>
      <Card.Header className="flex flex-row items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <ChevronRight className="size-4 text-gray-400" />
      </Card.Header>
      <Card.Content>
        {visibleDishes.length === 0 ? (
          <EmptyState.Root>
            <EmptyState.Content className="py-6">
              <EmptyState.Indicator>
                <UtensilsCrossed className="size-5" />
              </EmptyState.Indicator>
              <EmptyState.Title>등록할 메뉴가 없습니다</EmptyState.Title>
              <EmptyState.Description>탭하여 메뉴를 추가하세요</EmptyState.Description>
            </EmptyState.Content>
          </EmptyState.Root>
        ) : (
          <ul className="space-y-2">
            {visibleDishes.map((dish, dishIndex) => {
              const names = dish.ingredients
                .map((ingredient) => nameById.get(ingredient.fridge_item_id))
                .filter(Boolean);
              return (
                <li key={dishIndex} className="rounded-md bg-gray-50 px-3 py-2 text-sm">
                  <p className="font-medium">{dish.name || '이름 없는 메뉴'}</p>
                  {names.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">{names.join(' · ')}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card.Content>
    </Card>
  );
}
