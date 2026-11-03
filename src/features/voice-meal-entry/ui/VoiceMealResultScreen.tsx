'use client';

import { type ReactNode, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AppScreen } from '@stackflow/plugin-basic-ui';

import { cn } from '@/commons/lib';
import { CTAConfirmButton, Input, SegmentControl, Switch, Toast } from '@/commons/ui';

import { budgetKeys } from '@/entities/budget';
import { diningExpenseKeys } from '@/entities/dining-expense';
import { foodExpenseKeys } from '@/entities/food-expense';
import { fridgeItemKeys } from '@/entities/fridge-item';
import { ingredientKeys } from '@/entities/ingredient';
import { mealKeys, type MealType } from '@/entities/meal';

import {
  buildStockPreview,
  type ParsedExpense,
  type ParsedMealResult,
  type ParsedPurchase,
  type StockUpdate,
  type StockPreview,
  type VoiceExpenseKind,
  type VoiceUnit,
} from '../lib';
import {
  attachPurchaseLinks,
  saveVoiceExpense,
  saveVoicePurchase,
  saveVoiceStockUpdate,
  saveVoiceMeal,
  toDraftDishes,
  toSavableDishes,
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
  noIngredient: '냉장고 재료를 연결하지 못해 식단에는 남지 않아요. 아래에서 재료를 골라 주세요',
  brandRequired: '가게 이름을 적으면 식비를 기록할 수 있어요',
  expenseFailed: '다른 기록은 저장했지만 외식비는 기록하지 못했어요. 외식비만 다시 저장해 주세요',
  mealFailed: '식단을 기록하지 못했어요. 잠시 뒤 다시 저장해 주세요',
  purchaseFailed: '장보기를 기록하지 못했어요. 잠시 뒤 다시 저장해 주세요',
  stockFailed: '냉장고 정리를 기록하지 못했어요. 잠시 뒤 다시 저장해 주세요',
  noPurchase: '"마트에서 계란 샀어"처럼 말하면 장보기도 함께 기록돼요',
};

/* -------------------------------------------------------------------------------------------------
 * VoiceMealReview
 * -----------------------------------------------------------------------------------------------*/

/** 결과 화면에 넣을 식단 메뉴 편집기. 식단 편집 화면과 같은 메뉴 카드를 apps 층에서 넘겨준다 */
export type RenderDishesEditor = (props: {
  dishes: VoiceDraftDish[];
  onDishesChange: (dishes: VoiceDraftDish[]) => void;
}) => ReactNode;

interface VoiceMealResultScreenProps {
  householdId: string;
  result: ParsedMealResult;
  onClose: () => void;
  renderDishesEditor: RenderDishesEditor;
}

/**
 * 정리 결과 화면 "이렇게 기록할까요?" — 식단, 냉장고에서 빠지는 재료, 식비를 확인하고 고친 뒤 저장한다.
 * "다시 말하기"는 이 화면 위에 말하기 시트를 새로 열고, 정리가 끝나면 결과를 새것으로 바꾼다.
 */
export function VoiceMealResultScreen({
  householdId,
  result: initialResult,
  onClose,
  renderDishesEditor,
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
    <AppScreen className="pointer-events-auto" appBar={{ title: '음성 기록' }}>
      <VoiceMealReview
        key={revision}
        householdId={householdId}
        result={result}
        onSaved={onClose}
        onSpeakAgain={speakAgain}
        renderDishesEditor={renderDishesEditor}
      />
    </AppScreen>
  );
}

interface VoiceMealReviewProps {
  householdId: string;
  result: ParsedMealResult;
  onSaved: () => void;
  onSpeakAgain: () => void;
  renderDishesEditor: RenderDishesEditor;
}

function VoiceMealReview({
  householdId,
  result,
  onSaved,
  onSpeakAgain,
  renderDishesEditor,
}: VoiceMealReviewProps) {
  const queryClient = useQueryClient();
  const [dishes, setDishes] = useState<VoiceDraftDish[]>(() => toDraftDishes(result.dishes));
  const savableDishes = toSavableDishes(dishes);
  const hasMeal = savableDishes.length > 0;
  const stock = buildStockPreview(
    savableDishes,
    new Map(result.fridgeItems.map((item) => [item.id, item])),
  );

  const [purchases, setPurchases] = useState<ParsedPurchase[]>(result.purchases);
  const [purchaseStore, setPurchaseStore] = useState(result.purchaseStore);
  const [isPurchaseOn, setIsPurchaseOn] = useState(result.purchases.length > 0);
  const [isPurchaseSaved, setIsPurchaseSaved] = useState(false);
  const [isStockOn, setIsStockOn] = useState(result.stockUpdates.length > 0);
  const [isStockSaved, setIsStockSaved] = useState(false);
  const linkedDishNames = new Set(result.purchaseLinks.map((link) => link.dish_name));
  const willSavePurchases = isPurchaseOn && !isPurchaseSaved && purchases.length > 0;
  const willSaveStock = isStockOn && !isStockSaved && result.stockUpdates.length > 0;
  const willLinkPurchases = isPurchaseOn && result.purchaseLinks.length > 0;

  const [type, setType] = useState<MealType>(result.type);
  const [isMealOn, setIsMealOn] = useState(
    () => toDraftDishes(result.dishes).length > 0 || result.purchaseLinks.length > 0,
  );
  const [isMealSaved, setIsMealSaved] = useState(false);
  const [expense, setExpense] = useState<ParsedExpense | null>(result.expense);
  const [isExpenseOn, setIsExpenseOn] = useState(result.expense !== null);
  const [isBrandMissing, setIsBrandMissing] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const brandInputRef = useRef<HTMLInputElement>(null);

  const dateLabel = format(parseISO(result.date), 'M월 d일', { locale: ko });
  const willSaveMeal = (hasMeal || willLinkPurchases) && isMealOn && !isMealSaved;
  const willSaveExpense = expense !== null && isExpenseOn;
  const outDishes = result.dishes.filter(
    (dish) => dish.ingredients.length === 0 && !linkedDishNames.has(dish.name),
  );
  const purchaseTotal = willSavePurchases || isPurchaseSaved ? sumPrices(purchases) : 0;
  const expenseTotal = willSaveExpense ? expense.price : 0;

  function updatePurchase(index: number, patch: Partial<ParsedPurchase>) {
    setPurchases((current) =>
      current.map((purchase, purchaseIndex) =>
        purchaseIndex === index ? { ...purchase, ...patch } : purchase,
      ),
    );
  }

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
    queryClient.invalidateQueries({ queryKey: ingredientKeys.all });
    queryClient.invalidateQueries({ queryKey: mealKeys.fridgeItemsAll });
  }

  /** 저장 순서: 장보기(새 구매분이 생김) → 냉장고 정리 → 식단(산 재료 잇기) → 외식비. 실패하면 그 단계에서 멈추고 앞 단계는 저장된 채로 둔다 */
  async function save() {
    if (willSaveExpense && !expense.brand.trim()) {
      setIsBrandMissing(true);
      brandInputRef.current?.focus();
      return;
    }

    setIsSaving(true);
    setExpenseError(null);
    const done: string[] = [];

    let fridgeItemIdByPurchase: Array<string | null> = [];
    if (willSavePurchases) {
      try {
        for (const purchase of purchases) {
          fridgeItemIdByPurchase.push(
            await saveVoicePurchase({
              householdId,
              date: result.date,
              store: purchaseStore,
              purchase,
            }),
          );
        }
        setIsPurchaseSaved(true);
        done.push(`장보기 ${purchases.length}건`);
      } catch (error) {
        invalidate();
        Toast.error(error instanceof Error ? error.message : MESSAGE.purchaseFailed);
        setIsSaving(false);
        return;
      }
    } else {
      fridgeItemIdByPurchase = purchases.map(() => null);
    }

    if (willSaveStock) {
      try {
        for (const update of result.stockUpdates) await saveVoiceStockUpdate(update);
        setIsStockSaved(true);
        done.push('냉장고 정리');
      } catch (error) {
        invalidate();
        Toast.error(error instanceof Error ? error.message : MESSAGE.stockFailed);
        setIsSaving(false);
        return;
      }
    }

    if (willSaveMeal) {
      try {
        const mealDishes = toSavableDishes(
          await attachPurchaseLinks({
            householdId,
            dishes: savableDishes,
            links: result.purchaseLinks,
            purchases,
            fridgeItemIdByPurchase,
          }),
        );
        if (mealDishes.length > 0) {
          await saveVoiceMeal({ householdId, date: result.date, type, dishes: mealDishes });
          done.push(`${dateLabel} ${MEAL_TYPE_LABEL[type]} 식단`);
        }
        setIsMealSaved(true);
      } catch (error) {
        invalidate();
        Toast.error(error instanceof Error ? error.message : MESSAGE.mealFailed);
        setIsSaving(false);
        return;
      }
    }

    if (willSaveExpense) {
      try {
        await saveVoiceExpense(householdId, expense);
        done.push(`외식비 ${expense.price.toLocaleString('ko-KR')}원`);
      } catch {
        invalidate();
        setExpenseError(
          done.length > 0
            ? MESSAGE.expenseFailed
            : '외식비를 기록하지 못했어요. 잠시 뒤 다시 저장해 주세요',
        );
        setIsSaving(false);
        return;
      }
    }

    invalidate();
    Toast.success(`${done.join(', ')}을 기록했어요`);
    setIsSaving(false);
    onSaved();
  }

  return (
    <>
      <div className="flex flex-col gap-5 px-4 pt-5 pb-28">
        <div>
          <h2 className="text-[22px] leading-8 font-semibold break-keep text-gray-900">
            이렇게 기록할까요?
          </h2>
          {result.summary && (
            <p className="mt-1 text-[15px] leading-relaxed break-keep text-gray-500">
              {result.summary}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white px-4">
          <ReviewSection
            title="식단"
            toggle={!isMealSaved ? { checked: isMealOn, onChange: setIsMealOn } : undefined}
          >
            <dl>
              <ReceiptRow label="날짜" value={dateLabel} />
            </dl>
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
            {!isMealSaved && (
              <div className={cn(!isMealOn && 'pointer-events-none opacity-50')}>
                {renderDishesEditor({ dishes, onDishesChange: setDishes })}
              </div>
            )}
            {willLinkPurchases && (
              <dl className="flex flex-col gap-1.5">
                {result.purchaseLinks.map((link) => (
                  <ReceiptRow
                    key={`${link.dish_name}-${link.purchase_index}`}
                    label={link.dish_name}
                    value={`새로 산 ${purchases[link.purchase_index]?.name ?? ''}${link.amount > 0 ? ` ${link.amount}개` : ''}`}
                  />
                ))}
              </dl>
            )}
            {outDishes.length > 0 && (
              <p className="text-[15px] leading-relaxed break-keep text-gray-500">
                {outDishes.map((dish) => dish.name).join(', ')}:{' '}
                {expense ? MESSAGE.outMenu : MESSAGE.noIngredient}
              </p>
            )}
            {result.unmatched.length > 0 && (
              <p className="text-[15px] leading-relaxed break-keep text-amber-700">
                냉장고에서 찾지 못한 재료:{' '}
                {result.unmatched.map((entry) => entry.spoken).join(', ')}
              </p>
            )}
          </ReviewSection>

          <ReviewSection
            title="장보기"
            toggle={
              purchases.length > 0 && !isPurchaseSaved
                ? { checked: isPurchaseOn, onChange: setIsPurchaseOn }
                : undefined
            }
          >
            {purchases.length === 0 ? (
              <p className="text-[15px] break-keep text-gray-500">{MESSAGE.noPurchase}</p>
            ) : (
              <div
                className={cn(
                  'flex flex-col gap-3',
                  !isPurchaseOn && 'pointer-events-none opacity-50',
                )}
              >
                <LabeledInput label="가게">
                  <Input
                    value={purchaseStore}
                    maxLength={30}
                    placeholder="예: 이마트"
                    onChange={(event) => setPurchaseStore(event.target.value)}
                  />
                </LabeledInput>
                {purchases.map((purchase, index) => (
                  <PurchaseEditor
                    key={index}
                    purchase={purchase}
                    categories={result.categories}
                    onChange={(patch) => updatePurchase(index, patch)}
                  />
                ))}
              </div>
            )}
          </ReviewSection>

          <ReviewSection title="냉장고에서 빠지는 재료">
            {stock.length === 0 && !willLinkPurchases ? (
              <p className="text-[15px] text-gray-500">{MESSAGE.noStock}</p>
            ) : (
              <dl className="flex flex-col gap-1.5">
                {stock.map((row) => (
                  <ReceiptRow key={row.batch_id} label={row.name} value={formatStock(row)} />
                ))}
                {willLinkPurchases &&
                  result.purchaseLinks.map((link) => {
                    const purchase = purchases[link.purchase_index];
                    if (!purchase) return null;
                    return (
                      <ReceiptRow
                        key={`link-${link.dish_name}-${link.purchase_index}`}
                        label={purchase.name}
                        value={formatPurchaseUse(purchase, link.amount, link.usage_status)}
                      />
                    );
                  })}
              </dl>
            )}
          </ReviewSection>

          {result.stockUpdates.length > 0 && (
            <ReviewSection
              title="냉장고 정리"
              toggle={!isStockSaved ? { checked: isStockOn, onChange: setIsStockOn } : undefined}
            >
              <dl className={cn('flex flex-col gap-1.5', !isStockOn && 'opacity-50')}>
                {result.stockUpdates.map((update) => (
                  <ReceiptRow
                    key={update.fridge_item_id}
                    label={update.name}
                    value={formatStockUpdate(update)}
                  />
                ))}
              </dl>
            </ReviewSection>
          )}

          <ReviewSection
            title="외식비"
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
          {purchaseTotal + expenseTotal > 0 && (
            <dl className="flex flex-col gap-1.5 border-t border-dashed border-gray-300 py-4">
              {purchaseTotal > 0 && expenseTotal > 0 && (
                <>
                  <ReceiptRow label="장보기" value={`${purchaseTotal.toLocaleString('ko-KR')}원`} />
                  <ReceiptRow label="외식비" value={`${expenseTotal.toLocaleString('ko-KR')}원`} />
                </>
              )}
              <div className="flex items-center justify-between text-[17px] font-semibold text-gray-900">
                <dt>식비 합계</dt>
                <dd>{(purchaseTotal + expenseTotal).toLocaleString('ko-KR')}원</dd>
              </div>
            </dl>
          )}
        </div>
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
            (!willSavePurchases && !willSaveStock && !willSaveMeal && !willSaveExpense) ||
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
    <section className="flex flex-col gap-3 border-t border-dashed border-gray-300 py-4 first:border-t-0">
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

interface PurchaseEditorProps {
  purchase: ParsedPurchase;
  categories: ParsedMealResult['categories'];
  onChange: (patch: Partial<ParsedPurchase>) => void;
}

/** 장보기 한 줄 — 이름, 분류, 양, 금액을 고친다. 단위는 냉장고에 들어갈 단위라 보여 주기만 한다 */
function PurchaseEditor({ purchase, categories, onChange }: PurchaseEditorProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-gray-50 p-3">
      <Input
        value={purchase.name}
        maxLength={30}
        aria-label="산 품목 이름"
        onChange={(event) => onChange({ name: event.target.value })}
      />
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <select
          value={purchase.category_id}
          onChange={(event) => onChange({ category_id: event.target.value })}
          aria-label="분류"
          className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-900"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
        <label className="flex h-11 items-center gap-1 rounded-md border border-gray-300 bg-white px-3">
          <input
            inputMode="decimal"
            value={String(purchase.count)}
            onChange={(event) => {
              const next = Number(event.target.value.replace(/[^\d.]/g, ''));
              if (Number.isFinite(next) && next > 0) onChange({ count: next });
            }}
            aria-label="양"
            className="w-14 bg-transparent text-right text-base text-gray-900 outline-none"
          />
          <span className="text-[15px] text-gray-600">{UNIT_LABEL[purchase.unit]}</span>
        </label>
      </div>
      <Input
        inputMode="numeric"
        value={purchase.price.toLocaleString('ko-KR')}
        aria-label="금액"
        onChange={(event) =>
          onChange({ price: Number(event.target.value.replace(/\D/g, '')) || 0 })
        }
      />
    </div>
  );
}

/** 영수증 한 줄 — 이름은 왼쪽, 값은 오른쪽 */
function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-[15px]">
      <dt className="shrink-0 text-gray-600">{label}</dt>
      <dd className="text-right break-keep text-gray-900">{value}</dd>
    </div>
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

function sumPrices(purchases: ParsedPurchase[]) {
  return purchases.reduce((sum, purchase) => sum + purchase.price, 0);
}

function formatPurchaseUse(
  purchase: ParsedPurchase,
  amount: number,
  usageStatus: 'used' | 'depleted',
) {
  const unit = UNIT_LABEL[purchase.unit];
  const bought = `새로 산 ${purchase.count.toLocaleString('ko-KR')}${unit}`;
  if (purchase.unit !== 'count')
    return usageStatus === 'depleted'
      ? `${bought} → 0${unit}`
      : `${bought} 그대로 (썼다고만 남겨요)`;
  return `${bought} → ${(purchase.count - amount).toLocaleString('ko-KR')}${unit}`;
}

function formatStockUpdate(update: StockUpdate) {
  const unit = UNIT_LABEL[update.unit];
  const change = `${update.before.toLocaleString('ko-KR')}${unit} → ${update.after.toLocaleString('ko-KR')}${unit}`;
  return update.action === 'discard' ? `${change} (버림)` : `${change} (남은 양)`;
}

function formatStock(stock: StockPreview) {
  const unit = UNIT_LABEL[stock.unit];
  const before = `${stock.before.toLocaleString('ko-KR')}${unit}`;
  if (stock.mode === 'use') return `${before} 그대로 (썼다고만 남겨요)`;
  return `${before} → ${stock.after.toLocaleString('ko-KR')}${unit}`;
}
