'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { useForm } from '@tanstack/react-form';
import { overlay } from 'overlay-kit';
import { useConditionalEffect } from 'react-simplikit';
import { z } from 'zod';

import { DOMAIN_ERROR_MESSAGE, ERROR_MSG } from '@/commons/lib';
import { CTAButton, ProgressBar, Toast } from '@/commons/ui';
import { Form } from '@/commons/ui/Form';

import {
  getBudgetScopeLabel,
  hasAnyBudget,
  toBudgetAmountMap,
  type BudgetAmountMap,
  type BudgetScope,
} from '@/entities/budget';

import { useUpsertBudgetsMutation } from '../api/mutations';
import { useBudgetDailySeriesQuery, useBudgetsQuery } from '../api/queries';
import { formatMonthLabel, getPreviousYearMonth } from '../lib/budgetMonth';
import { sumSpentByScope } from '../lib/budgetSeries';

import { BudgetAmountInput } from './BudgetAmountInput';
import { BudgetCopyBottomSheet } from './BudgetCopyBottomSheet';
import { BudgetScopeIcon } from './BudgetScopeIcon';
import { BudgetScopeField } from './BudgetScopeField';

/* -------------------------------------------------------------------------------------------------
 * Schema
 *
 * null은 미설정(추적하지 않음), 0은 "0원으로 산다"는 목표다. 둘을 구분해서 저장한다.
 * 합계 초과는 입력 단계에서 막지 않는다. 전체 50만을 넣고 항목을 채워 나가는 순서를 차단하면
 * 전체부터 고치러 왕복해야 한다. 실시간 에러로만 알리고 저장 시점에 스키마가 다시 막으며,
 * 서버 RPC도 같은 규칙을 재검증한다.
 * -----------------------------------------------------------------------------------------------*/

const MAX_BUDGET_AMOUNT = 1_000_000_000;

const amountSchema = z
  .number()
  .min(0, ERROR_MSG.RANGE.MIN({ fieldName: '예산', min: '0원' }))
  .max(MAX_BUDGET_AMOUNT, ERROR_MSG.RANGE.MAX({ fieldName: '예산', max: '10억원' }))
  .nullable();

const budgetFormSchema = z
  .object({
    total: amountSchema,
    grocery: amountSchema,
    restaurant: amountSchema,
    delivery: amountSchema,
  })
  .superRefine((value, ctx) => {
    if (value.total === null) return;

    const itemSum = (value.grocery ?? 0) + (value.restaurant ?? 0) + (value.delivery ?? 0);

    if (itemSum > value.total) {
      ctx.addIssue({
        code: 'custom',
        path: ['total'],
        message: DOMAIN_ERROR_MESSAGE.BUD_001,
      });
    }
  });

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

const ITEM_SCOPES = ['grocery', 'restaurant', 'delivery'] as const satisfies readonly Exclude<
  BudgetScope,
  'total'
>[];

function toFormValues(amounts: BudgetAmountMap): BudgetFormValues {
  return {
    total: amounts.total,
    grocery: amounts.grocery,
    restaurant: amounts.restaurant,
    delivery: amounts.delivery,
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
  // 같은 시리즈가 대상 월과 직전 월을 모두 담고 있어, 지난달 지출은 추가 요청 없이 뽑아 쓴다.
  const { data: series = [] } = useBudgetDailySeriesQuery(householdId, yearMonth);
  const upsertMutation = useUpsertBudgetsMutation();
  const formId = `budget-edit-form-${yearMonth}`;

  const amounts = toBudgetAmountMap(budgets);
  const previousAmounts = toBudgetAmountMap(previousBudgets);
  const lastMonthSpent = sumSpentByScope(series, previousYearMonth);

  const form = useForm({
    defaultValues: toFormValues(amounts),
    validators: {
      onSubmit: budgetFormSchema,
      onChange: budgetFormSchema,
    },
    onSubmit: async ({ value }) => {
      upsertMutation.mutate(
        { householdId, yearMonth, budgets: value },
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
    for (const key of Object.keys(next) as BudgetScope[]) {
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
          className="flex flex-col gap-4"
        >
          {/* 월 예산 — 나머지 세 항목의 기준이라 따로 둔다 */}
          <section className="flex flex-col gap-2 rounded-xl border bg-white p-4">
            <form.Field name="total">
              {(field) => (
                <Form.Field field={field}>
                  <Form.Label className="text-base text-gray-800">월 예산</Form.Label>
                  <Form.Control>
                    <BudgetAmountInput
                      value={field.state.value}
                      onValueChange={(next) => field.handleChange(next)}
                      invalid={Boolean(field.state.meta.errors[0])}
                    />
                  </Form.Control>
                  <Form.Error />
                </Form.Field>
              )}
            </form.Field>

            <form.Subscribe selector={(state) => state.values}>
              {(values) => {
                const itemSum =
                  (values.grocery ?? 0) + (values.restaurant ?? 0) + (values.delivery ?? 0);

                if (values.total === null) {
                  return (
                    <p className="text-xs text-gray-400">
                      월 예산을 정하면 항목별로 나눠 담을 수 있어요
                    </p>
                  );
                }

                const remaining = values.total - itemSum;

                return (
                  <div className="flex flex-col gap-1.5">
                    <ProgressBar value={itemSum} max={values.total} />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">
                        {itemSum.toLocaleString()} / {values.total.toLocaleString()}원
                      </span>
                      <span
                        className={
                          remaining < 0
                            ? 'font-semibold text-red-500'
                            : 'font-semibold text-gray-700'
                        }
                      >
                        {remaining < 0
                          ? `${Math.abs(remaining).toLocaleString()}원 초과`
                          : `${remaining.toLocaleString()}원 남음`}
                      </span>
                    </div>
                  </div>
                );
              }}
            </form.Subscribe>
          </section>

          {/* 항목별 예산 */}
          <section className="divide-y rounded-xl border bg-white px-4">
            {ITEM_SCOPES.map((scope) => (
              <form.Field key={scope} name={scope}>
                {(field) => (
                  <BudgetScopeField
                    icon={<BudgetScopeIcon scope={scope} />}
                    label={getBudgetScopeLabel(scope)}
                    lastMonthSpent={lastMonthSpent[scope]}
                    value={field.state.value}
                    onValueChange={(next) => field.handleChange(next)}
                  />
                )}
              </form.Field>
            ))}
          </section>
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
