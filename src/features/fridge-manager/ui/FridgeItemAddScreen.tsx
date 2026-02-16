'use client';

import { useState } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { useForm } from '@tanstack/react-form';
import { format } from 'date-fns';

import { CATEGORIES } from '@/commons/config';
import { Button, Counter, DatePicker, Input, Select, Textarea, Toast } from '@/commons/ui';

import { useAddFridgeItemMutation } from '../api/mutations';

interface FridgeItemAddScreenProps {
  onClose: () => void;
  householdId: string;
}

interface FridgeItemCreateFormValues {
  category: string;
  name: string;
  quantity: number;
  unit: 'count' | 'g';
  is_subdivided: boolean;
  purchased_date: string;
  expiry_date: string;
  memo: string;
}

/** 냉장고 아이템 + 첫 배치 동시 추가 화면 */
export function FridgeItemAddScreen({ onClose, householdId }: FridgeItemAddScreenProps) {
  const [isPurchasedDateUnknown, setIsPurchasedDateUnknown] = useState(false);
  const mutation = useAddFridgeItemMutation();
  const today = new Date();

  const parseDateValue = (value: string) => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return '재료 추가 중 오류가 발생했습니다';
  };

  const defaultValues: FridgeItemCreateFormValues = {
    category: 'other',
    name: '',
    quantity: 1,
    unit: 'count',
    is_subdivided: false,
    purchased_date: format(today, 'yyyy-MM-dd'),
    expiry_date: '',
    memo: '',
  };

  const form = useForm({
    defaultValues,
    onSubmit: ({ value }) => {
      const normalizedName = value.name.trim();
      if (!normalizedName) {
        Toast.warn('재료명을 입력해 주세요');
        return;
      }

      mutation.mutate(
        {
          item: {
            household_id: householdId,
            name: normalizedName,
            category: value.category,
            unit: value.unit,
            is_subdivided: value.is_subdivided,
          },
          batch: {
            quantity: value.quantity,
            purchased_date: isPurchasedDateUnknown
              ? format(today, 'yyyy-MM-dd')
              : value.purchased_date,
            expiry_date: value.expiry_date || null,
            memo: value.memo.trim() || null,
          },
        },
        {
          onSuccess: () => {
            Toast.success('재료가 추가되었습니다');
            onClose();
          },
          onError: (error) => {
            Toast.error(getErrorMessage(error));
          },
        },
      );
    },
  });

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: '재료 추가',
        renderRight: () => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => form.handleSubmit()}
            disabled={mutation.isPending}
            aria-label="재료 추가"
          >
            {mutation.isPending ? '추가 중...' : '추가'}
          </Button>
        ),
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          form.handleSubmit();
        }}
        className="flex flex-col gap-5 p-4"
      >
        {/* 기본 정보 */}
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold text-gray-500">기본 정보</legend>

          <form.Field name="category">
            {(field) => (
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">카테고리</span>
                <Select value={field.state.value} onValueChange={field.handleChange}>
                  <Select.Trigger>
                    <Select.Value placeholder="카테고리를 선택하세요" />
                  </Select.Trigger>
                  <Select.Content>
                    {CATEGORIES.map((category) => (
                      <Select.Item key={category.id} value={category.id}>
                        {category.emoji} {category.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </label>
            )}
          </form.Field>

          <form.Field name="name">
            {(field) => (
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">재료명</span>
                <Input
                  type="text"
                  placeholder="예: 감자"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  required
                />
              </label>
            )}
          </form.Field>

          <div className="grid grid-cols-[1fr_104px] gap-2">
            <form.Field name="quantity">
              {(field) => (
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">수량</span>
                  <Counter
                    value={field.state.value}
                    min={0}
                    step={1}
                    onChange={field.handleChange}
                  />
                </label>
              )}
            </form.Field>

            <form.Field name="unit">
              {(field) => (
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">단위</span>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value as 'count' | 'g')}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder="단위" />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="count">개</Select.Item>
                      <Select.Item value="g">g</Select.Item>
                    </Select.Content>
                  </Select>
                </label>
              )}
            </form.Field>
          </div>

          <form.Field name="is_subdivided">
            {(field) => (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={field.state.value}
                  onChange={(event) => field.handleChange(event.target.checked)}
                  className="size-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium">소분 보관 여부</span>
              </label>
            )}
          </form.Field>
        </fieldset>

        <div className="border-t border-gray-100" />

        {/* 날짜 정보 */}
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold text-gray-500">날짜 정보</legend>

          <form.Field name="purchased_date">
            {(field) => (
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">구매일</span>
                <label className="mb-1 flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={isPurchasedDateUnknown}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setIsPurchasedDateUnknown(checked);
                      if (checked) {
                        field.handleChange(format(today, 'yyyy-MM-dd'));
                      }
                    }}
                    className="size-4 rounded border-gray-300"
                  />
                  구매일 모름
                </label>
                <DatePicker
                  value={parseDateValue(field.state.value)}
                  disabled={isPurchasedDateUnknown}
                  maxDate={today}
                  onChange={(date) =>
                    field.handleChange(date ? format(date, 'yyyy-MM-dd') : field.state.value)
                  }
                  placeholder="구매일을 선택하세요"
                />
              </label>
            )}
          </form.Field>

          <form.Field name="expiry_date">
            {(field) => (
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">유통기한 (선택)</span>
                <DatePicker
                  value={parseDateValue(field.state.value)}
                  onChange={(date) => field.handleChange(date ? format(date, 'yyyy-MM-dd') : '')}
                  placeholder="유통기한을 선택하세요"
                />
              </label>
            )}
          </form.Field>
        </fieldset>

        <div className="border-t border-gray-100" />

        {/* 추가 정보 */}
        <form.Field name="memo">
          {(field) => (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">메모 (선택)</span>
              <Textarea
                placeholder="예: 냉동실 보관"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                rows={3}
              />
            </label>
          )}
        </form.Field>
      </form>
    </AppScreen>
  );
}
