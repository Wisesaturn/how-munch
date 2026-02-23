'use client';

import * as React from 'react';

import { SingleSelectBottomSheet, type SingleSelectBottomSheetProps } from '@/commons/ui';

import { type IngredientCategoryOption } from '../model/types';

type CategoryBottomSheetProps = Pick<SingleSelectBottomSheetProps, 'open' | 'onOpenChange'> & {
  value: string;
  onValueChange: (value: string) => void;
  options: IngredientCategoryOption[];
};

/**
 * @description 카테고리 선택용 BottomSheet 본체입니다. WheelPicker에서 임시 선택 후 확인 시 반영합니다.
 */
function CategoryBottomSheet({
  open,
  onOpenChange,
  value,
  onValueChange,
  options,
}: CategoryBottomSheetProps) {
  const items = React.useMemo(
    () =>
      options.map((option) => ({
        value: option.id,
        label: (
          <span className="inline-flex items-center gap-1.5">
            {option.emoji ? (
              <span className="font-tossface" aria-hidden>
                {option.emoji}
              </span>
            ) : null}
            <span>{option.label}</span>
          </span>
        ),
      })),
    [options],
  );

  return (
    <SingleSelectBottomSheet
      open={open}
      onOpenChange={onOpenChange}
      value={value}
      onValueChange={onValueChange}
      items={items}
      heading="카테고리 선택"
      confirmLabel="확인"
      className="space-y-4"
    />
  );
}

export { CategoryBottomSheet, type CategoryBottomSheetProps };
