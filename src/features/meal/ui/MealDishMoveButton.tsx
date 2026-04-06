'use client';

import { type DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';

interface MealDishMoveButtonProps {
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
}

/**
 * @description 메뉴(Dish) 드래그 핸들 컴포넌트.
 * @hello-pangea/dnd의 dragHandleProps를 전달받아 드래그 핸들 아이콘을 렌더링한다.
 * 꾸욱 누른 뒤 드래그하여 끼니 내 순서를 변경할 수 있다.
 */
function MealDishMoveButton({ dragHandleProps }: MealDishMoveButtonProps) {
  return (
    <span
      {...dragHandleProps}
      className="inline-flex shrink-0 cursor-grab items-center justify-center p-1 text-gray-400 active:cursor-grabbing"
      aria-label="드래그하여 순서 변경"
    >
      <GripVertical className="size-4" />
    </span>
  );
}

export { MealDishMoveButton };
