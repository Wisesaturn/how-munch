'use client';

import * as React from 'react';

import { useControlledState } from 'react-simplikit';

import { cn } from '../lib';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { WheelPicker, type WheelPickerOption } from './WheelPicker';

export interface SingleSelectBottomSheetItem {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

interface SingleSelectBottomSheetProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  items: SingleSelectBottomSheetItem[];
  heading?: React.ReactNode;
  confirmLabel?: string;
  className?: string;
}

/**
 * @description 단일 항목 선택을 위한 BottomSheet + WheelPicker 조합 UI입니다.
 */
function SingleSelectBottomSheet({
  open,
  defaultOpen = false,
  onOpenChange,
  value,
  defaultValue = '',
  onValueChange,
  items,
  heading = '선택',
  confirmLabel = '확인',
  className,
}: SingleSelectBottomSheetProps) {
  const [isOpen, setIsOpen] = useControlledState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const [currentValue, setCurrentValue] = useControlledState<string>({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const [draftValue, setDraftValue] = React.useState(currentValue);

  const wheelOptions = React.useMemo<WheelPickerOption<string>[]>(
    () =>
      items.map((item) => ({
        value: item.value,
        label: item.label,
        disabled: item.disabled,
      })),
    [items],
  );

  React.useEffect(
    function syncDraftValueWhenOpen() {
      if (!isOpen) return;
      const hasCurrentValue = items.some((item) => item.value === currentValue && !item.disabled);
      if (hasCurrentValue) {
        setDraftValue(currentValue);
        return;
      }

      const firstEnabledValue = items.find((item) => !item.disabled)?.value ?? '';
      setDraftValue(firstEnabledValue);
    },
    [isOpen, currentValue, items],
  );

  function closeSheet() {
    setIsOpen(false);
  }

  function confirmSelectedValue() {
    setCurrentValue(draftValue);
    closeSheet();
  }

  return (
    <BottomSheet open={isOpen} onClose={closeSheet}>
      <BottomSheet.Header heading={heading} />
      <BottomSheet.Content className={cn('space-y-4', className)}>
        {wheelOptions.length > 0 ? (
          <WheelPicker>
            <WheelPicker.Item
              value={draftValue}
              options={wheelOptions}
              onValueChange={setDraftValue}
            />
          </WheelPicker>
        ) : null}
        <Button
          type="button"
          className="w-full"
          onClick={confirmSelectedValue}
          disabled={wheelOptions.length === 0}
        >
          {confirmLabel}
        </Button>
      </BottomSheet.Content>
    </BottomSheet>
  );
}

export { SingleSelectBottomSheet, type SingleSelectBottomSheetProps };
