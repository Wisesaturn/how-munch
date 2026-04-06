'use client';

import { useState } from 'react';

import { ArrowLeftRight } from 'lucide-react';

import { Button, SingleSelectBottomSheet, Toast } from '@/commons/ui';

import { type MealType } from '@/entities/meal';

import { useMoveDishMutation } from '../api/mutations';

const MEAL_TYPE_LABEL: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const MOVE_ALERT_MSG = {
  success: (targetLabel: string) => `${targetLabel}으로 이동했습니다`,
  failed: '메뉴 이동에 실패했습니다',
};

interface MealDishMoveButtonProps {
  dishId: string;
  currentMealType: MealType;
  householdId: string;
  date: string;
}

/**
 * @description 메뉴(Dish)를 다른 끼니로 이동하는 버튼 컴포넌트.
 * 클릭 시 BottomSheet를 열어 대상 끼니를 선택하면 move_dish_to_meal RPC를 호출한다.
 */
function MealDishMoveButton({
  dishId,
  currentMealType,
  householdId,
  date,
}: MealDishMoveButtonProps) {
  const [open, setOpen] = useState(false);
  const moveMutation = useMoveDishMutation();

  const moveTargetItems = MEAL_TYPE_ORDER.filter((type) => type !== currentMealType).map(
    (type) => ({
      value: type,
      label: MEAL_TYPE_LABEL[type],
    }),
  );

  function openMoveSheet() {
    setOpen(true);
  }

  function moveDishToTarget(targetMealType: string) {
    const validTarget = targetMealType as MealType;
    const targetLabel = MEAL_TYPE_LABEL[validTarget];

    moveMutation.mutate(
      { dishId, targetMealType: validTarget, householdId, date },
      {
        onSuccess: () => {
          Toast.success(MOVE_ALERT_MSG.success(targetLabel));
        },
        onError: (error) => {
          const errorMessage =
            error instanceof Error ? error.message : MOVE_ALERT_MSG.failed;
          Toast.error(errorMessage);
        },
      },
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-gray-400"
        onClick={(e) => {
          e.stopPropagation();
          openMoveSheet();
        }}
        disabled={moveMutation.isPending}
        aria-label="다른 끼니로 이동"
      >
        <ArrowLeftRight className="size-3.5" />
      </Button>
      <SingleSelectBottomSheet
        open={open}
        onOpenChange={setOpen}
        items={moveTargetItems}
        heading="이동할 끼니 선택"
        confirmLabel="이동"
        onValueChange={moveDishToTarget}
      />
    </>
  );
}

export { MealDishMoveButton };
