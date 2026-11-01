'use client';

import { format, parseISO } from 'date-fns';
import { Check, ChevronLeft, Loader2, X } from 'lucide-react';
import { AppScreen } from '@stackflow/plugin-basic-ui';

import { cn } from '@/commons/lib';
import { Button, Checkbox, CTAButton } from '@/commons/ui';

import { computeExpiryDate, useCategoryExpiryDefaultsQuery } from '@/entities/fridge-item';
import { useIngredientCategoriesQuery } from '@/entities/ingredient-category';

import { useAddIngredientMutation, useDispatchHouseholdActivityMutation } from '../api/mutations';
import { buildIngredientBatchInputs } from '../lib/ingredientBatch';
import { type StagedItem } from '../lib/parseAiResponse';
import { setPendingPromptEditCallback } from '../model/promptIngredientEditStore';
import { type SaveState, usePromptIngredientStore } from '../model/promptIngredientStore';

import { IngredientItem } from './IngredientItem';

interface PromptIngredientStagingScreenProps {
  onClose: () => void;
  onComplete: () => void;
  householdId: string;
  userId: string;
  onEditItem: (item: StagedItem) => void;
}

const rowBg: Record<SaveState, string> = {
  idle: 'bg-white',
  saving: 'bg-blue-50',
  success: 'bg-[oklch(0.96_0.05_145)]',
  error: 'bg-[oklch(0.96_0.05_25)]',
};

function SaveStateIcon({ state }: { state: SaveState }) {
  if (state === 'saving') {
    return <Loader2 className="size-4 shrink-0 animate-spin text-blue-400" />;
  }
  if (state === 'success') {
    return (
      <span className="animate-in zoom-in-50 flex size-4 shrink-0 items-center justify-center rounded-full bg-green-500 duration-300">
        <Check className="size-2.5 text-white" strokeWidth={3} />
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="animate-in zoom-in-50 flex size-4 shrink-0 items-center justify-center rounded-full bg-red-400 duration-300">
        <X className="size-2.5 text-white" strokeWidth={3} />
      </span>
    );
  }
  return null;
}

function formatExpiryDate(date: string) {
  return format(parseISO(date), 'MM.dd');
}

/**
 * @description 항목 목록에 보여줄 유통기한 요약 문구를 만든다.
 * 나눈 항목은 배치 수와 날짜 범위를, 단일 배치는 유통기한만 표시한다.
 */
function resolveExpirySummary(item: StagedItem, defaultDays: number | undefined) {
  const batches = item.batches ?? [];
  if (batches.length > 0) {
    const dates = batches
      .map((batch) => batch.expiry_date)
      .filter((date): date is string => Boolean(date))
      .sort();
    if (dates.length === 0) return `재고 묶음 ${batches.length}개`;
    const first = formatExpiryDate(dates[0]);
    const last = formatExpiryDate(dates[dates.length - 1]);
    return `재고 묶음 ${batches.length}개 · ${first === last ? first : `${first} ~ ${last}`}`;
  }

  const expiry =
    item.expiry_date === undefined ? computeExpiryDate(item.date, defaultDays) : item.expiry_date;
  return expiry ? `유통기한 ${formatExpiryDate(expiry)}` : '유통기한 없음';
}

function formatWon(amount: number) {
  return `${amount.toLocaleString('ko-KR')}원`;
}

interface ReceiptTotalSummaryProps {
  selectedTotal: number;
  receiptTotal: number | null;
}

/** 목록 아래에 영수증처럼 선택 합계와 영수증 합계를 비교해 보여준다 */
function ReceiptTotalSummary({ selectedTotal, receiptTotal }: ReceiptTotalSummaryProps) {
  const difference = receiptTotal === null ? 0 : receiptTotal - selectedTotal;

  return (
    <dl className="flex flex-col gap-1.5 border-t border-dashed border-gray-300 px-1 pt-3 text-sm">
      <div className="flex items-center justify-between font-semibold text-gray-900">
        <dt>선택 합계</dt>
        <dd>{formatWon(selectedTotal)}</dd>
      </div>
      {receiptTotal !== null ? (
        <>
          <div className="flex items-center justify-between text-gray-600">
            <dt>영수증 합계</dt>
            <dd>{formatWon(receiptTotal)}</dd>
          </div>
          <div className="flex items-center justify-between text-gray-600">
            <dt>차액</dt>
            <dd>{formatWon(difference)}</dd>
          </div>
          {difference !== 0 ? (
            <p className="text-xs text-gray-400">
              미선택 항목, 비식품, 할인 등으로 다를 수 있어요.
            </p>
          ) : null}
        </>
      ) : null}
    </dl>
  );
}

export function PromptIngredientStagingScreen({
  onClose,
  onComplete,
  householdId,
  userId,
  onEditItem,
}: PromptIngredientStagingScreenProps) {
  const {
    items,
    receiptTotal,
    checkedIds,
    saveStates,
    toggleCheck,
    toggleAll,
    updateItem,
    setSaveState,
    reset,
  } = usePromptIngredientStore();
  const addMutation = useAddIngredientMutation();
  const dispatchActivityMutation = useDispatchHouseholdActivityMutation();
  const { data: categories = [] } = useIngredientCategoriesQuery(householdId);
  const { data: expiryDefaults } = useCategoryExpiryDefaultsQuery(householdId);

  const isSaving = Object.values(saveStates).some((s) => s === 'saving');
  const doneCount = Object.values(saveStates).filter(
    (s) => s === 'success' || s === 'error',
  ).length;
  const selectedItems = items.filter((i) => checkedIds.includes(i.id));
  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.price, 0);
  const allChecked = items.length > 0 && items.every((i) => checkedIds.includes(i.id));

  function resolveCategory(item: StagedItem) {
    const cat = categories.find((c) => c.id === item.category_id);
    return { label: cat?.label ?? '기타', emoji: cat?.emoji };
  }

  function openEdit(item: StagedItem) {
    if (isSaving) return;
    setPendingPromptEditCallback((updates) => updateItem(item.id, updates));
    onEditItem(item);
  }

  async function saveAll() {
    if (isSaving || selectedItems.length === 0) return;

    const successNames: string[] = [];

    for (const item of selectedItems) {
      setSaveState(item.id, 'saving');
      const nextState = await addMutation
        .mutateAsync({
          household_id: householdId,
          user_id: userId,
          date: item.date,
          category_id: item.category_id,
          name: item.name,
          brand: item.brand || null,
          count: item.count,
          unit: item.unit,
          store: item.store || null,
          price: item.price,
          batches: buildIngredientBatchInputs(item),
          skipNotification: true,
        })
        .then(() => {
          successNames.push(item.name);
          return 'success' as const;
        })
        .catch(() => 'error' as const);
      setSaveState(item.id, nextState);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }

    if (successNames.length > 0) {
      dispatchActivityMutation.mutate({
        householdId,
        itemNames: successNames,
        triggeredBy: userId,
      });
    }

    reset();
    onComplete();
  }

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: '추가할 항목 선택',
        backButton: {
          render: () => (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="뒤로가기"
              disabled={isSaving}
            >
              <ChevronLeft className="size-5" />
            </Button>
          ),
        },
      }}
    >
      <div className="flex flex-col gap-3 px-4 pt-4 pb-28">
        {/* 전체 선택 */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="text-sm font-medium text-gray-600"
            onClick={toggleAll}
            disabled={isSaving}
          >
            {allChecked ? '전체 해제' : '전체 선택'}
          </button>
          <span className="text-xs text-gray-400">
            {checkedIds.length}/{items.length}개 선택
          </span>
        </div>

        {/* 아이템 목록 */}
        {items.map((item) => {
          const state = saveStates[item.id] ?? 'idle';
          const checked = checkedIds.includes(item.id);

          const isCompleted = state === 'success' || state === 'error';
          const isCurrentlySaving = state === 'saving';

          return (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-3 py-2.5',
                'transition-[background-color] duration-500 ease-out',
                rowBg[state],
              )}
            >
              {/* 상태 아이콘 / 체크박스 */}
              <div className="shrink-0">
                {isCompleted || isCurrentlySaving ? (
                  <SaveStateIcon state={state} />
                ) : (
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleCheck(item.id)}
                    disabled={isSaving}
                  />
                )}
              </div>

              {/* 항목 내용 */}
              <button
                type="button"
                className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
                onClick={() => openEdit(item)}
                disabled={isSaving}
              >
                <IngredientItem
                  name={item.name}
                  brand={item.brand}
                  price={item.price}
                  count={item.count}
                  unit={item.unit}
                  store={item.store}
                  categoryLabel={resolveCategory(item).label}
                  categoryEmoji={resolveCategory(item).emoji}
                  size="sm"
                />
                <span className="text-xs text-gray-500">
                  {resolveExpirySummary(item, expiryDefaults?.[item.category_id])}
                </span>
              </button>
            </div>
          );
        })}

        <ReceiptTotalSummary selectedTotal={selectedTotal} receiptTotal={receiptTotal} />
      </div>

      <CTAButton
        type="button"
        color="confirm"
        variant="filled"
        onClick={saveAll}
        disabled={isSaving || selectedItems.length === 0}
      >
        {isSaving
          ? `저장 중... (${doneCount}/${selectedItems.length})`
          : `${selectedItems.length}개 추가`}
      </CTAButton>
    </AppScreen>
  );
}
