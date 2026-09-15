'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { useForm } from '@tanstack/react-form';
import { overlay } from 'overlay-kit';
import { useConditionalEffect } from 'react-simplikit';
import { z } from 'zod';

import { DOMAIN_ERROR_MESSAGE, ERROR_MSG } from '@/commons/lib';
import { CTAButton, PriceInput, Switch, Toast } from '@/commons/ui';
import { Form } from '@/commons/ui/Form';

import {
  getBudgetScopeLabel,
  hasAnyBudget,
  toBudgetAmountMap,
  type BudgetAmountMap,
  type BudgetScope,
} from '@/entities/budget';

import { useUpsertBudgetsMutation } from '../api/mutations';
import { useBudgetsQuery } from '../api/queries';
import { formatMonthLabel, getPreviousYearMonth } from '../lib/budgetMonth';

import { BudgetCopyBottomSheet } from './BudgetCopyBottomSheet';

/* -------------------------------------------------------------------------------------------------
 * Schema
 *
 * 입력 단계에서 막지 않는다. 전체 50만 → 장보기 40만 → 외식 20만 순으로 넣을 때
 * 입력 자체를 차단하면 전체부터 고치러 왕복해야 한다. 그래서 실시간 에러로만 알리고,
 * 저장 시점에 스키마가 다시 막는다. 서버 RPC도 같은 규칙을 재검증한다.
 * -----------------------------------------------------------------------------------------------*/

const MAX_BUDGET_AMOUNT = 1_000_000_000;

const amountSchema = z
  .number()
  .min(0, ERROR_MSG.RANGE.MIN({ fieldName: '예산', min: '0원' }))
  .max(MAX_BUDGET_AMOUNT, ERROR_MSG.RANGE.MAX({ fieldName: '예산', max: '10억원' }));

const budgetFormSchema = z
  .object({
    totalEnabled: z.boolean(),
    totalAmount: amountSchema,
    groceryEnabled: z.boolean(),
    groceryAmount: amountSchema,
    restaurantEnabled: z.boolean(),
    restaurantAmount: amountSchema,
    deliveryEnabled: z.boolean(),
    deliveryAmount: amountSchema,
  })
  .superRefine((value, ctx) => {
    if (!value.totalEnabled) return;

    const itemSum =
      (value.groceryEnabled ? value.groceryAmount : 0) +
      (value.restaurantEnabled ? value.restaurantAmount : 0) +
      (value.deliveryEnabled ? value.deliveryAmount : 0);

    if (itemSum > value.totalAmount) {
      ctx.addIssue({
        code: 'custom',
        path: ['totalAmount'],
        message: DOMAIN_ERROR_MESSAGE.BUD_001,
      });
    }
  });

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

const SCOPE_FIELDS = [
  { scope: 'total', enabledName: 'totalEnabled', amountName: 'totalAmount' },
  { scope: 'grocery', enabledName: 'groceryEnabled', amountName: 'groceryAmount' },
  { scope: 'restaurant', enabledName: 'restaurantEnabled', amountName: 'restaurantAmount' },
  { scope: 'delivery', enabledName: 'deliveryEnabled', amountName: 'deliveryAmount' },
] as const satisfies readonly {
  scope: BudgetScope;
  enabledName: keyof BudgetFormValues;
  amountName: keyof BudgetFormValues;
}[];

function toFormValues(amounts: BudgetAmountMap): BudgetFormValues {
  return {
    totalEnabled: amounts.total !== null,
    totalAmount: amounts.total ?? 0,
    groceryEnabled: amounts.grocery !== null,
    groceryAmount: amounts.grocery ?? 0,
    restaurantEnabled: amounts.restaurant !== null,
    restaurantAmount: amounts.restaurant ?? 0,
    deliveryEnabled: amounts.delivery !== null,
    deliveryAmount: amounts.delivery ?? 0,
  };
}

function toBudgetPayload(values: BudgetFormValues): Partial<BudgetAmountMap> {
  return {
    total: values.totalEnabled ? values.totalAmount : null,
    grocery: values.groceryEnabled ? values.groceryAmount : null,
    restaurant: values.restaurantEnabled ? values.restaurantAmount : null,
    delivery: values.deliveryEnabled ? values.deliveryAmount : null,
  };
}

/* -------------------------------------------------------------------------------------------------
 * BudgetEditScreen
 * -----------------------------------------------------------------------------------------------*/

interface BudgetEditScreenProps {
  onClose: () => void;
  householdId: string;
  /** 'YYYY-MM' */
  yearMonth: string;
}

export function BudgetEditScreen({ onClose, householdId, yearMonth }: BudgetEditScreenProps) {
  const previousYearMonth = getPreviousYearMonth(yearMonth);
  const { data: budgets = [], isSuccess } = useBudgetsQuery(householdId, yearMonth);
  const { data: previousBudgets = [], isSuccess: isPreviousLoaded } = useBudgetsQuery(
    householdId,
    previousYearMonth,
  );
  const upsertMutation = useUpsertBudgetsMutation();
  const formId = `budget-edit-form-${yearMonth}`;

  const amounts = toBudgetAmountMap(budgets);
  const previousAmounts = toBudgetAmountMap(previousBudgets);

  const form = useForm({
    defaultValues: toFormValues(amounts),
    validators: {
      onSubmit: budgetFormSchema,
      onChange: budgetFormSchema,
    },
    onSubmit: async ({ value }) => {
      upsertMutation.mutate(
        { householdId, yearMonth, budgets: toBudgetPayload(value) },
        {
          onSuccess: () => {
            Toast.success('예산이 저장되었습니다');
            onClose();
          },
          onError: (error) => {
            Toast.error(error instanceof Error ? error.message : '예산 저장에 실패했습니다');
          },
        },
      );
    },
  });

  function applyPreviousAmounts() {
    const next = toFormValues(previousAmounts);
    for (const key of Object.keys(next) as (keyof BudgetFormValues)[]) {
      form.setFieldValue(key, next[key]);
    }
  }

  // 이번 달이 미설정이고 직전 달 예산이 있을 때만 복사 제안을 띄운다.
  useConditionalEffect(
    function suggestPreviousMonthBudget() {
      overlay.open(({ isOpen, close, unmount }) => {
        function closeSheet() {
          close();
          window.setTimeout(unmount, 200);
        }

        return (
          <BudgetCopyBottomSheet
            open={isOpen}
            onClose={closeSheet}
            onApply={() => {
              closeSheet();
              applyPreviousAmounts();
            }}
            previousMonthLabel={formatMonthLabel(previousYearMonth)}
            previousAmounts={previousAmounts}
          />
        );
      });
    },
    [isSuccess, isPreviousLoaded, hasAnyBudget(amounts), hasAnyBudget(previousAmounts)] as const,
    (_, [loaded, previousLoaded, hasCurrent, hasPrevious]) =>
      loaded && previousLoaded && !hasCurrent && hasPrevious,
  );

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{ title: `${formatMonthLabel(yearMonth)} 예산 편집` }}
    >
      <div className="px-4 pt-4 pb-28">
        <form
          id={formId}
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-5"
        >
          {SCOPE_FIELDS.map(({ scope, enabledName, amountName }) => (
            <div key={scope} className="flex flex-col gap-2">
              <form.Field name={enabledName}>
                {(field) => (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">
                      {getBudgetScopeLabel(scope)}
                    </span>
                    <Switch
                      checked={Boolean(field.state.value)}
                      onCheckedChange={(checked) => field.handleChange(checked)}
                      aria-label={`${getBudgetScopeLabel(scope)} 예산 사용`}
                    />
                  </div>
                )}
              </form.Field>

              <form.Subscribe selector={(state) => Boolean(state.values[enabledName])}>
                {(enabled) =>
                  enabled ? (
                    <form.Field name={amountName}>
                      {(field) => (
                        <Form.Field field={field}>
                          <Form.Control>
                            <PriceInput
                              value={Number(field.state.value)}
                              onChange={(next) => field.handleChange(next)}
                            />
                          </Form.Control>
                          <Form.Error />
                        </Form.Field>
                      )}
                    </form.Field>
                  ) : (
                    <p className="text-xs text-gray-400">
                      미설정 — 이 항목은 예산을 추적하지 않아요
                    </p>
                  )
                }
              </form.Subscribe>
            </div>
          ))}
        </form>
      </div>

      {/* 저장 버튼은 비활성화하지 않는다. 눌렀을 때 이유를 알려주는 편이 전달이 낫다. */}
      <CTAButton
        type="submit"
        form={formId}
        color="confirm"
        variant="filled"
        hideOnScroll
        disabled={upsertMutation.isPending}
      >
        저장
      </CTAButton>
    </AppScreen>
  );
}
