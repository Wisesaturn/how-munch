'use client';

import { useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AppScreen } from '@stackflow/plugin-basic-ui';

import { cn } from '@/commons/lib';
import { Button, CTAConfirmButton, Input, SegmentControl, Switch, Toast } from '@/commons/ui';

import { budgetKeys } from '@/entities/budget';
import { diningExpenseKeys } from '@/entities/dining-expense';
import { foodExpenseKeys } from '@/entities/food-expense';
import { fridgeItemKeys } from '@/entities/fridge-item';
import { type Meal, mealKeys, type MealType } from '@/entities/meal';

import {
  type ParsedExpense,
  type ParsedMealResult,
  type StockPreview,
  type VoiceExpenseKind,
  type VoiceUnit,
} from '../lib';
import {
  fetchExistingMeal,
  saveVoiceExpense,
  saveVoiceMeal,
  toDraftDishes,
  type VoiceDraftDish,
} from '../model';

import { openVoiceMealEntrySheet } from './VoiceMealEntrySheet';

/* -------------------------------------------------------------------------------------------------
 * Constants
 * -----------------------------------------------------------------------------------------------*/

const MEAL_TYPE_LABEL: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};
const MEAL_TYPES = Object.keys(MEAL_TYPE_LABEL) as MealType[];

const KIND_LABEL: Record<VoiceExpenseKind, string> = {
  restaurant: '식당',
  delivery: '배달',
};

const UNIT_LABEL: Record<VoiceUnit, string> = { count: '개', g: 'g', kg: 'kg', ml: 'ml', l: 'L' };

const MESSAGE = {
  noStock: '빠지는 재료가 없어요',
  noExpense: '금액을 말하면 식비도 함께 기록돼요',
  outMenu: '재료가 없는 메뉴는 식단 탭에 남지 않아요. 식비에 메뉴 이름을 남겨 둘게요',
  noIngredient:
    '냉장고 재료를 연결하지 못해 식단에는 남지 않아요. 편집 화면에서 재료를 골라 주세요',
  brandRequired: '가게 이름을 적으면 식비를 기록할 수 있어요',
  expenseFailed: '식단은 기록했지만 식비는 기록하지 못했어요. 식비만 다시 저장해 주세요',
  mealFailed: '식단을 기록하지 못했어요. 잠시 뒤 다시 저장해 주세요',
};

/* -------------------------------------------------------------------------------------------------
 * VoiceMealReview
 * -----------------------------------------------------------------------------------------------*/

export interface OpenMealEditorInput {
  date: string;
  type: MealType;
  meal: Meal | null;
  draftDishes: VoiceDraftDish[];
}

interface VoiceMealResultScreenProps {
  householdId: string;
  result: ParsedMealResult;
  onClose: () => void;
  onOpenEditor: (input: OpenMealEditorInput) => void;
}

/**
 * 정리 결과 화면 "이렇게 기록할까요?" — 식단, 냉장고에서 빠지는 재료, 식비를 확인하고 고친 뒤 저장한다.
 * "다시 말하기"는 이 화면 위에 말하기 시트를 새로 열고, 정리가 끝나면 결과를 새것으로 바꾼다.
 */
export function VoiceMealResultScreen({
  householdId,
  result: initialResult,
  onClose,
  onOpenEditor,
}: VoiceMealResultScreenProps) {
  const [result, setResult] = useState(initialResult);
  /** 다시 말해 결과가 바뀌면 고친 값도 처음부터 다시 잡는다 */
  const [revision, setRevision] = useState(0);

  function speakAgain() {
    openVoiceMealEntrySheet({
      householdId,
      onParsed: (nextResult) => {
        setResult(nextResult);
        setRevision((current) => current + 1);
      },
    });
  }

  return (
    <AppScreen className="pointer-events-auto" appBar={{ title: '말로 기록하기' }}>
      <VoiceMealReview
        key={revision}
        householdId={householdId}
        result={result}
        onSaved={onClose}
        onSpeakAgain={speakAgain}
        onOpenEditor={onOpenEditor}
      />
    </AppScreen>
  );
}

interface VoiceMealReviewProps {
  householdId: string;
  result: ParsedMealResult;
  onSaved: () => void;
  onSpeakAgain: () => void;
  onOpenEditor: (input: OpenMealEditorInput) => void;
}

function VoiceMealReview({
  householdId,
  result,
  onSaved,
  onSpeakAgain,
  onOpenEditor,
}: VoiceMealReviewProps) {
  const queryClient = useQueryClient();
  const draftDishes = toDraftDishes(result.dishes);
  const hasMeal = draftDishes.length > 0;

  const [type, setType] = useState<MealType>(result.type);
  const [isMealOn, setIsMealOn] = useState(hasMeal);
  const [isMealSaved, setIsMealSaved] = useState(false);
  const [expense, setExpense] = useState<ParsedExpense | null>(result.expense);
  const [isExpenseOn, setIsExpenseOn] = useState(result.expense !== null);
  const [isBrandMissing, setIsBrandMissing] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const brandInputRef = useRef<HTMLInputElement>(null);

  const dateLabel = format(parseISO(result.date), 'M월 d일', { locale: ko });
  const willSaveMeal = hasMeal && isMealOn && !isMealSaved;
  const willSaveExpense = expense !== null && isExpenseOn;
  const outDishes = result.dishes.filter((dish) => dish.ingredients.length === 0);

  function updateExpense(patch: Partial<ParsedExpense>) {
    setExpense((current) => (current ? { ...current, ...patch } : current));
    if (patch.brand !== undefined) setIsBrandMissing(false);
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: mealKeys.listByDate(householdId, result.date) });
    queryClient.invalidateQueries({ queryKey: mealKeys.summaries(householdId) });
    queryClient.invalidateQueries({ queryKey: mealKeys.fridgeItems(householdId) });
    queryClient.invalidateQueries({ queryKey: fridgeItemKeys.all });
    queryClient.invalidateQueries({ queryKey: foodExpenseKeys.all });
    queryClient.invalidateQueries({ queryKey: diningExpenseKeys.all });
    queryClient.invalidateQueries({ queryKey: budgetKeys.all });
  }

  async function save() {
    if (willSaveExpense && !expense.brand.trim()) {
      setIsBrandMissing(true);
      brandInputRef.current?.focus();
      return;
    }

    setIsSaving(true);
    setExpenseError(null);
    let savedMeal = isMealSaved;

    if (willSaveMeal) {
      try {
        await saveVoiceMeal({ householdId, date: result.date, type, dishes: draftDishes });
        savedMeal = true;
        setIsMealSaved(true);
      } catch (error) {
        Toast.error(error instanceof Error ? error.message : MESSAGE.mealFailed);
        setIsSaving(false);
        return;
      }
    }

    if (willSaveExpense) {
      try {
        await saveVoiceExpense(householdId, expense);
      } catch {
        invalidate();
        setExpenseError(
          savedMeal
            ? MESSAGE.expenseFailed
            : '식비를 기록하지 못했어요. 잠시 뒤 다시 저장해 주세요',
        );
        setIsSaving(false);
        return;
      }
    }

    invalidate();
    Toast.success(
      buildDoneMessage({ dateLabel, type, savedMeal, expense: willSaveExpense ? expense : null }),
    );
    setIsSaving(false);
    onSaved();
  }

  async function openEditor() {
    try {
      const meal = await fetchExistingMeal(householdId, result.date, type);
      onOpenEditor({ date: result.date, type, meal, draftDishes });
    } catch {
      Toast.error('편집 화면을 열지 못했어요. 잠시 뒤 다시 눌러 주세요');
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
        <div>
          <h2 className="text-center text-[22px] leading-8 font-semibold break-keep text-gray-900">
            이렇게 기록할까요?
          </h2>
          {result.summary && (
            <p className="mt-1 text-center text-[15px] leading-relaxed break-keep text-gray-500">
              {result.summary}
            </p>
          )}
        </div>

        <ReviewSection
          title="식단"
          toggle={
            hasMeal && !isMealSaved ? { checked: isMealOn, onChange: setIsMealOn } : undefined
          }
        >
          <p className="text-[15px] font-medium text-gray-900">{dateLabel}</p>
          <SegmentControl
            value={type}
            onValueChange={(next) => setType(next as MealType)}
            aria-label="끼니"
          >
            {MEAL_TYPES.map((mealType) => (
              <SegmentControl.Item key={mealType} value={mealType}>
                {MEAL_TYPE_LABEL[mealType]}
              </SegmentControl.Item>
            ))}
          </SegmentControl>
          {isMealSaved && <p className="text-[15px] text-emerald-700">식단은 기록했어요</p>}
          {draftDishes.length > 0 && (
            <ul className="flex flex-col gap-2">
              {result.dishes
                .filter((dish) => dish.ingredients.length > 0)
                .map((dish) => (
                  <li key={dish.name}>
                    <p className="text-[15px] font-semibold text-gray-900">{dish.name}</p>
                    <p className="text-[15px] break-keep text-gray-600">
                      {dish.ingredients.map(formatIngredient).join(', ')}
                    </p>
                  </li>
                ))}
            </ul>
          )}
          {outDishes.length > 0 && (
            <p className="text-[15px] leading-relaxed break-keep text-gray-500">
              {outDishes.map((dish) => dish.name).join(', ')}:{' '}
              {expense ? MESSAGE.outMenu : MESSAGE.noIngredient}
            </p>
          )}
          {hasMeal && !isMealSaved && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => void openEditor()}
              disabled={isSaving}
            >
              편집 화면에서 고치기
            </Button>
          )}
          {result.unmatched.length > 0 && (
            <p className="text-[15px] leading-relaxed break-keep text-amber-700">
              냉장고에서 찾지 못한 재료: {result.unmatched.map((entry) => entry.spoken).join(', ')}
            </p>
          )}
        </ReviewSection>

        <ReviewSection title="냉장고에서 빠지는 재료">
          {result.stock.length === 0 ? (
            <p className="text-[15px] text-gray-500">{MESSAGE.noStock}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {result.stock.map((stock) => (
                <li key={stock.batch_id} className="text-[15px] text-gray-900">
                  {formatStock(stock)}
                </li>
              ))}
            </ul>
          )}
        </ReviewSection>

        <ReviewSection
          title="식비"
          toggle={expense ? { checked: isExpenseOn, onChange: setIsExpenseOn } : undefined}
        >
          {expense ? (
            <div className={cn('flex flex-col gap-3', !isExpenseOn && 'opacity-50')}>
              <SegmentControl
                value={expense.kind}
                onValueChange={(next) =>
                  updateExpense({
                    kind: next as VoiceExpenseKind,
                    store: next === 'delivery' ? expense.store : '',
                  })
                }
                aria-label="식비 종류"
              >
                {(Object.keys(KIND_LABEL) as VoiceExpenseKind[]).map((kind) => (
                  <SegmentControl.Item key={kind} value={kind}>
                    {KIND_LABEL[kind]}
                  </SegmentControl.Item>
                ))}
              </SegmentControl>
              <LabeledInput label="금액">
                <Input
                  inputMode="numeric"
                  value={expense.price.toLocaleString('ko-KR')}
                  onChange={(event) =>
                    updateExpense({ price: Number(event.target.value.replace(/\D/g, '')) || 0 })
                  }
                  disabled={!isExpenseOn}
                />
              </LabeledInput>
              <LabeledInput label="가게 이름">
                <Input
                  ref={brandInputRef}
                  value={expense.brand}
                  maxLength={30}
                  placeholder="예: 김밥천국"
                  onChange={(event) => updateExpense({ brand: event.target.value })}
                  aria-invalid={isBrandMissing}
                  disabled={!isExpenseOn}
                />
              </LabeledInput>
              {isBrandMissing && (
                <p role="alert" className="text-[15px] break-keep text-red-600">
                  {MESSAGE.brandRequired}
                </p>
              )}
              <LabeledInput label="메뉴">
                <Input
                  value={expense.name}
                  maxLength={20}
                  onChange={(event) => updateExpense({ name: event.target.value })}
                  disabled={!isExpenseOn}
                />
              </LabeledInput>
              {expense.kind === 'delivery' && (
                <LabeledInput label="배달 플랫폼">
                  <Input
                    value={expense.store}
                    maxLength={20}
                    placeholder="예: 배달의민족"
                    onChange={(event) => updateExpense({ store: event.target.value })}
                    disabled={!isExpenseOn}
                  />
                </LabeledInput>
              )}
              {expenseError && (
                <p role="alert" className="text-[15px] break-keep text-red-600">
                  {expenseError}
                </p>
              )}
            </div>
          ) : (
            <p className="text-[15px] text-gray-500">{MESSAGE.noExpense}</p>
          )}
        </ReviewSection>
      </div>

      <CTAConfirmButton>
        <CTAConfirmButton.Left
          type="button"
          color="cancel"
          variant="subtle"
          onClick={onSpeakAgain}
          disabled={isSaving}
        >
          다시 말하기
        </CTAConfirmButton.Left>
        <CTAConfirmButton.Right
          type="button"
          color="confirm"
          variant="filled"
          onClick={() => void save()}
          disabled={
            isSaving ||
            (!willSaveMeal && !willSaveExpense) ||
            (willSaveExpense && expense.price <= 0)
          }
        >
          {isSaving ? '저장하는 중' : '저장'}
        </CTAConfirmButton.Right>
      </CTAConfirmButton>
    </>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Parts
 * -----------------------------------------------------------------------------------------------*/

interface ReviewSectionProps {
  title: string;
  toggle?: { checked: boolean; onChange: (checked: boolean) => void };
  children: React.ReactNode;
}

function ReviewSection({ title, toggle, children }: ReviewSectionProps) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-4">
      <div className="flex min-h-7 items-center justify-between">
        <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
        {toggle && (
          <Switch
            checked={toggle.checked}
            onCheckedChange={toggle.onChange}
            aria-label={`${title} 함께 기록하기`}
          />
        )}
      </div>
      {children}
    </section>
  );
}

function LabeledInput({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[15px] text-gray-600">{label}</span>
      {children}
    </label>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Format
 * -----------------------------------------------------------------------------------------------*/

function formatIngredient(ingredient: ParsedMealResult['dishes'][number]['ingredients'][number]) {
  if (ingredient.unit === 'count') return `${ingredient.name} ${ingredient.amount}개`;
  return `${ingredient.name} ${ingredient.usage_status === 'depleted' ? '다 씀' : '씀'}`;
}

function formatStock(stock: StockPreview) {
  const unit = UNIT_LABEL[stock.unit];
  const before = `${stock.before.toLocaleString('ko-KR')}${unit}`;
  if (stock.mode === 'use') return `${stock.name} ${before} 그대로 (썼다고만 남겨요)`;
  return `${stock.name} ${before} → ${stock.after.toLocaleString('ko-KR')}${unit}`;
}

function buildDoneMessage({
  dateLabel,
  type,
  savedMeal,
  expense,
}: {
  dateLabel: string;
  type: MealType;
  savedMeal: boolean;
  expense: ParsedExpense | null;
}) {
  const price = expense ? `식비 ${expense.price.toLocaleString('ko-KR')}원` : '';
  if (savedMeal && expense)
    return `${dateLabel} ${MEAL_TYPE_LABEL[type]} 식단과 ${price}을 기록했어요`;
  if (savedMeal) return `${dateLabel} ${MEAL_TYPE_LABEL[type]} 식단을 기록했어요`;
  return `${price}을 기록했어요`;
}
