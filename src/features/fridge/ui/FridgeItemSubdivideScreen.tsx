'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

import { ERROR_MSG } from '@/commons/lib';
import { CTAButton, Counter, Input, Select, Slider, Toast } from '@/commons/ui';
import { Form } from '@/commons/ui/Form';

import { type FridgeItemBatch, type FridgeItemUnit } from '@/entities/fridge-item';

import { useSubdivideFridgeItemMutation } from '../api/mutations';
import { calcSuggestedExpiryDate } from '../lib/subdivision';

interface FridgeItemSubdivideScreenProps {
  onSuccess: () => void;
  fridgeItemId: string;
  itemName: string;
  totalCount: number;
  unit: FridgeItemUnit;
  batches: FridgeItemBatch[];
}

const UNIT_LABEL: Record<FridgeItemUnit, string> = {
  count: '개',
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'L',
};

const FRIDGE_ITEM_UNITS: FridgeItemUnit[] = ['count', 'g', 'kg', 'ml', 'l'];

function resolveCounterStep(unit: FridgeItemUnit): number {
  return unit === 'count' || unit === 'g' || unit === 'ml' ? 1 : 0.1;
}

const subdivideSchema = z.object({
  consume_amount: z
    .number({ message: ERROR_MSG.FORMAT.INVALID({ fieldName: '소분 수량' }) })
    .min(0.001, ERROR_MSG.RANGE.GREATER_THAN({ fieldName: '소분 수량', min: 0 })),
  new_item_name: z
    .string()
    .min(1, ERROR_MSG.INPUT.REQUIRED({ fieldName: '품목명' }))
    .max(100, ERROR_MSG.RANGE.MAX({ fieldName: '품목명', max: 100 })),
  new_item_unit: z.enum(['count', 'g', 'kg', 'ml', 'l']),
  new_item_quantity: z
    .number({ message: ERROR_MSG.FORMAT.INVALID({ fieldName: '소분한 양' }) })
    .min(0.001, ERROR_MSG.RANGE.GREATER_THAN({ fieldName: '소분한 양', min: 0 })),
});

/** 냉장고 아이템 소분 화면 */
export function FridgeItemSubdivideScreen({
  onSuccess,
  fridgeItemId,
  itemName,
  totalCount,
  unit,
  batches,
}: FridgeItemSubdivideScreenProps) {
  const mutation = useSubdivideFridgeItemMutation();
  const formId = `subdivide-form-${fridgeItemId}`;

  const form = useForm({
    defaultValues: {
      consume_amount: 0,
      new_item_name: '',
      new_item_unit: unit,
      new_item_quantity: 1,
    },
    validators: {
      onSubmit: subdivideSchema,
      onChange: subdivideSchema,
    },
    onSubmit: ({ value }) => {
      mutation.mutate(
        {
          source_item_id: fridgeItemId,
          consume_amount: value.consume_amount,
          new_item_name: value.new_item_name,
          new_item_quantity: value.new_item_quantity,
          new_item_unit: value.new_item_unit,
          new_expiry_date: calcSuggestedExpiryDate(batches, value.consume_amount),
        },
        {
          onSuccess: () => {
            Toast.success('소분이 완료되었습니다');
            onSuccess();
          },
          onError: (error) => {
            Toast.error(error instanceof Error ? error.message : '소분 중 오류가 발생했습니다');
          },
        },
      );
    },
  });

  return (
    <AppScreen className="pointer-events-auto" appBar={{ title: '소분하기' }}>
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="flex flex-col gap-8 px-4 pt-6 pb-28"
      >
        <form.Field name="consume_amount">
          {(field) => (
            <Form.Field field={field}>
              <span className="pt-2 text-lg font-semibold text-gray-900">{itemName}</span>
              <Form.Label required>재고를 얼마나 사용하셨나요?</Form.Label>
              <p className="text-sm font-medium text-gray-700">
                {field.state.value} / {totalCount} {UNIT_LABEL[unit]}
              </p>
              <Form.Control>
                <Slider
                  min={0}
                  max={totalCount}
                  step={resolveCounterStep(unit)}
                  value={[field.state.value]}
                  onValueChange={(v) => field.handleChange(v[0])}
                  invalid={Boolean(field.state.meta.errors[0])}
                  className="mt-2"
                />
              </Form.Control>
              <Form.Error />
            </Form.Field>
          )}
        </form.Field>

        <form.Field name="new_item_name">
          {(field) => (
            <Form.Field field={field}>
              <Form.Label required>어떻게 소분하셨나요?</Form.Label>
              <Form.Control>
                <Input
                  placeholder="예: 1/4 양배추"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  invalid={Boolean(field.state.meta.errors[0])}
                />
              </Form.Control>
              <Form.Error />
            </Form.Field>
          )}
        </form.Field>

        <form.Field name="new_item_unit">
          {(field) => (
            <Form.Field field={field}>
              <Form.Label required>단위</Form.Label>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value as FridgeItemUnit)}
              >
                <Form.Control>
                  <Select.Trigger>
                    <Select.Value placeholder="단위를 선택하세요" />
                  </Select.Trigger>
                </Form.Control>
                <Select.Content>
                  {FRIDGE_ITEM_UNITS.map((u) => (
                    <Select.Item key={u} value={u}>
                      {UNIT_LABEL[u]}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
              <Form.Error />
            </Form.Field>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.new_item_unit}>
          {(selectedUnit) => (
            <form.Field name="new_item_quantity">
              {(field) => (
                <Form.Field field={field}>
                  <Form.Label required>소분한 양은 어떻게 되나요?</Form.Label>
                  <Form.Control>
                    <Counter
                      value={field.state.value}
                      min={0.001}
                      step={resolveCounterStep(selectedUnit)}
                      onValueChange={(v) => field.handleChange(v)}
                      invalid={Boolean(field.state.meta.errors[0])}
                    />
                  </Form.Control>
                  <Form.Error />
                </Form.Field>
              )}
            </form.Field>
          )}
        </form.Subscribe>
      </form>

      <CTAButton
        type="submit"
        form={formId}
        color="confirm"
        variant="filled"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? '소분 중...' : '소분 완료'}
      </CTAButton>
    </AppScreen>
  );
}
