'use client';

import { type ReactNode, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AppScreen } from '@stackflow/plugin-basic-ui';

import { cn } from '@/commons/lib';
import { CTAConfirmButton, SegmentControl, Switch, Toast } from '@/commons/ui';

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
  type StockPreview,
  type StockUpdate,
  type VoiceUnit,
} from '../lib';
import {
  useVoiceRecordStore,
  attachPurchaseLinks,
  saveVoiceExpense,
  saveVoiceMeal,
  saveVoicePurchase,
  saveVoiceStockUpdate,
  toSavableDishes,
  type VoiceDraftDish,
} from '../model';

import { CandidateChips, SynonymOfferBanner, VoiceDishChoices } from './VoiceMatchChoices';
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

const UNIT_LABEL: Record<VoiceUnit, string> = { count: '개', g: 'g', kg: 'kg', ml: 'ml', l: 'L' };

const MESSAGE = {
  noStock: '빠지는 재료가 없어요',
  noPurchase: '"마트에서 계란 샀어"처럼 말하면 장보기도 함께 기록돼요',
  noExpense: '"점심에 김치찌개 사 먹고 9,000원 냈어"처럼 말하면 외식비도 함께 기록돼요',
  outMenu: '사 먹은 메뉴는 식단 탭에 남지 않아요. 외식비에 메뉴 이름을 남겨 둘게요',
  outMenuNoExpense: '사 먹은 메뉴는 식단 탭에 남지 않아요. 금액을 말하면 외식비로 기록돼요',
  brandRequired: '가게 이름을 적으면 외식비를 기록할 수 있어요',
  expenseFailed: '다른 기록은 저장했지만 외식비는 기록하지 못했어요. 외식비만 다시 저장해 주세요',
  mealFailed: '식단을 기록하지 못했어요. 잠시 뒤 다시 저장해 주세요',
  purchaseFailed: '장보기를 기록하지 못했어요. 잠시 뒤 다시 저장해 주세요',
  stockFailed: '냉장고 정리를 기록하지 못했어요. 잠시 뒤 다시 저장해 주세요',
};

/* -------------------------------------------------------------------------------------------------
 * VoiceMealResultScreen
 * -----------------------------------------------------------------------------------------------*/

/**
 * 결과 화면에 기존 화면의 목록 항목과 편집 화면을 끼우는 연결. features끼리 가져다 쓸 수 없어 apps 층이 채운다.
 * render*는 식단 탭 끼니 카드, 영수증 추가 목록의 품목 줄, 식비 내역 줄을 그리고, edit*는 기존 편집 화면을 연다.
 */
export interface VoiceResultAdapters {
  renderMealCard: (props: {
    title: string;
    dishes: VoiceDraftDish[];
    onPress: () => void;
  }) => ReactNode;
  renderPurchaseItem: (props: { purchase: ParsedPurchase }) => ReactNode;
  renderExpenseItem: (props: { expense: ParsedExpense }) => ReactNode;
  editDishes: (props: {
    title: string;
    dishes: VoiceDraftDish[];
    onDone: (dishes: VoiceDraftDish[]) => void;
  }) => void;
  editPurchase: (props: {
    purchase: ParsedPurchase;
    date: string;
    onDone: (purchase: ParsedPurchase) => void;
  }) => void;
  editExpense: (props: {
    expense: ParsedExpense;
    onDone: (expense: ParsedExpense) => void;
  }) => void;
  /** 냉장고 품목 검색 화면을 열어 고른 품목 id를 돌려준다 */
  searchFridgeItem: (props: {
    items: Array<{ id: string; name: string; brand: string | null; depleted: boolean }>;
    onSelect: (itemId: string) => void;
  }) => void;
}

interface VoiceMealResultScreenProps {
  householdId: string;
  onClose: () => void;
  adapters: VoiceResultAdapters;
}

/**
 * 음성 기록 결과 화면 "이렇게 기록할까요?" — 식단, 장보기, 냉장고 정리, 외식비를 목록 항목으로 보여 주고,
 * 항목을 누르면 기존 편집 화면에서 고친다. "다시 말하기"는 말하기 시트를 새로 열고 결과를 새것으로 바꾼다.
 * 정리 결과와 고친 값은 useVoiceRecordStore에 있다(Activity params에 두면 history-sync가 객체를 깨뜨린다).
 */
export function VoiceMealResultScreen({
  householdId,
  onClose,
  adapters,
}: VoiceMealResultScreenProps) {
  const result = useVoiceRecordStore((state) => state.result);
  const start = useVoiceRecordStore((state) => state.start);
  const reset = useVoiceRecordStore((state) => state.reset);

  function speakAgain() {
    openVoiceMealEntrySheet({ householdId, onParsed: start });
  }

  function close() {
    onClose();
    reset();
  }

  return (
    <AppScreen className="pointer-events-auto" appBar={{ title: '음성 기록' }}>
      {result ? (
        <VoiceMealReview
          householdId={householdId}
          result={result}
          onSaved={close}
          onSpeakAgain={speakAgain}
          adapters={adapters}
        />
      ) : (
        <p className="px-4 pt-6 text-[15px] break-keep text-gray-500">
          기록할 내용이 없어요. 식단 탭의 마이크를 눌러 다시 말씀해주세요
        </p>
      )}
    </AppScreen>
  );
}

/* -------------------------------------------------------------------------------------------------
 * VoiceMealReview
 * -----------------------------------------------------------------------------------------------*/

interface VoiceMealReviewProps {
  householdId: string;
  result: ParsedMealResult;
  onSaved: () => void;
  onSpeakAgain: () => void;
  adapters: VoiceResultAdapters;
}

function VoiceMealReview({
  householdId,
  result,
  onSaved,
  onSpeakAgain,
  adapters,
}: VoiceMealReviewProps) {
  const queryClient = useQueryClient();
  const itemById = new Map(result.fridgeItems.map((item) => [item.id, item]));
  const dateLabel = format(parseISO(result.date), 'M월 d일', { locale: ko });

  const {
    type,
    dishes,
    purchases,
    expense,
    pendingIngredients,
    stockUpdates,
    pendingStockUpdates,
    pickStockItem,
    pickPurchaseItem,
    isMealOn,
    isPurchaseOn,
    isStockOn,
    isExpenseOn,
    update,
  } = useVoiceRecordStore();
  const setType = (next: MealType) => update({ type: next });
  const setIsMealOn = (next: boolean) => update({ isMealOn: next });
  const setIsPurchaseOn = (next: boolean) => update({ isPurchaseOn: next });
  const setIsStockOn = (next: boolean) => update({ isStockOn: next });
  const setIsExpenseOn = (next: boolean) => update({ isExpenseOn: next });
  const [isMealSaved, setIsMealSaved] = useState(false);
  const savableDishes = toSavableDishes(dishes);
  const stock = buildStockPreview(savableDishes, itemById);
  const linkedDishNames = new Set(result.purchaseLinks.map((link) => link.dish_name));
  const outDishes = result.dishes.filter((dish) => dish.isOut);
  const dishNames = new Set(dishes.map((dish) => dish.name));
  const openPendingIngredients = pendingIngredients.filter((pending) =>
    dishNames.has(pending.dish_name),
  );
  const unpickedPurchases = purchases.filter((purchase) => purchase.candidate_ids);
  /** 재료가 없어 저장할 때 빠지는 메뉴. 고를 재료가 남은 메뉴는 그 재료로 세므로 뺀다 */
  const emptyDishCount = dishes.filter(
    (dish) =>
      dish.ingredients.length === 0 &&
      !linkedDishNames.has(dish.name) &&
      !openPendingIngredients.some((pending) => pending.dish_name === dish.name),
  ).length;
  const skippedCount =
    (isMealOn ? openPendingIngredients.length + emptyDishCount : 0) +
    (isStockOn ? pendingStockUpdates.length : 0) +
    (isPurchaseOn ? unpickedPurchases.length : 0);

  const [isPurchaseSaved, setIsPurchaseSaved] = useState(false);
  const savablePurchaseCount = purchases.length - unpickedPurchases.length;
  const willSavePurchases = isPurchaseOn && !isPurchaseSaved && savablePurchaseCount > 0;
  const savablePurchaseLinks = result.purchaseLinks.filter(
    (link) => purchases[link.purchase_index] && !purchases[link.purchase_index].candidate_ids,
  );
  const willLinkPurchases = isPurchaseOn && savablePurchaseLinks.length > 0;

  const [isStockSaved, setIsStockSaved] = useState(false);
  const willSaveStock = isStockOn && !isStockSaved && stockUpdates.length > 0;

  const [expenseError, setExpenseError] = useState<string | null>(null);
  const willSaveExpense = expense !== null && isExpenseOn;
  const isBrandMissing = willSaveExpense && !expense.brand.trim();

  const willSaveMeal = (savableDishes.length > 0 || willLinkPurchases) && isMealOn && !isMealSaved;
  const purchaseTotal =
    willSavePurchases || isPurchaseSaved
      ? sumPrices(purchases.filter((purchase) => !purchase.candidate_ids))
      : 0;
  const expenseTotal = willSaveExpense ? expense.price : 0;
  const [isSaving, setIsSaving] = useState(false);

  function editDishes() {
    adapters.editDishes({
      title: `${dateLabel} ${MEAL_TYPE_LABEL[type]} 식단`,
      dishes,
      onDone: (nextDishes) => update({ dishes: nextDishes, isMealOn: true }),
    });
  }

  function editPurchase(index: number) {
    adapters.editPurchase({
      purchase: purchases[index],
      date: result.date,
      onDone: (nextPurchase) =>
        update({
          purchases: useVoiceRecordStore
            .getState()
            .purchases.map((purchase, purchaseIndex) =>
              purchaseIndex === index ? nextPurchase : purchase,
            ),
        }),
    });
  }

  function editExpense() {
    if (!expense) return;
    adapters.editExpense({
      expense,
      onDone: (nextExpense) => {
        update({ expense: nextExpense });
        setExpenseError(null);
      },
    });
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: mealKeys.listByDate(householdId, result.date) });
    queryClient.invalidateQueries({ queryKey: mealKeys.summaries(householdId) });
    queryClient.invalidateQueries({ queryKey: mealKeys.fridgeItemsAll });
    queryClient.invalidateQueries({ queryKey: fridgeItemKeys.all });
    queryClient.invalidateQueries({ queryKey: ingredientKeys.all });
    queryClient.invalidateQueries({ queryKey: foodExpenseKeys.all });
    queryClient.invalidateQueries({ queryKey: diningExpenseKeys.all });
    queryClient.invalidateQueries({ queryKey: budgetKeys.all });
  }

  function pickStock(pendingId: string, itemId: string) {
    const reason = pickStockItem(pendingId, itemId);
    if (reason) Toast.warn(reason);
  }

  /** 저장 순서: 장보기(새 구매분이 생김) → 냉장고 정리 → 식단(산 재료 잇기) → 외식비. 실패하면 그 단계에서 멈추고 앞 단계는 저장된 채로 둔다 */
  async function save() {
    if (isBrandMissing) {
      Toast.warn(MESSAGE.brandRequired);
      editExpense();
      return;
    }

    setIsSaving(true);
    setExpenseError(null);
    const done: string[] = [];

    const fridgeItemIdByPurchase: Array<string | null> = purchases.map(() => null);
    if (willSavePurchases) {
      try {
        for (const [index, purchase] of purchases.entries()) {
          if (purchase.candidate_ids) continue;
          fridgeItemIdByPurchase[index] = await saveVoicePurchase({
            householdId,
            date: result.date,
            store: result.purchaseStore,
            purchase,
          });
        }
        setIsPurchaseSaved(true);
        done.push(`장보기 ${savablePurchaseCount}건`);
      } catch (error) {
        invalidate();
        Toast.error(error instanceof Error ? error.message : MESSAGE.purchaseFailed);
        setIsSaving(false);
        return;
      }
    }

    if (willSaveStock) {
      try {
        for (const update of stockUpdates) await saveVoiceStockUpdate(update);
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
            links: savablePurchaseLinks,
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

        <ReviewSection
          title="식단"
          toggle={!isMealSaved ? { checked: isMealOn, onChange: setIsMealOn } : undefined}
        >
          <div className={cn('flex flex-col gap-3', !isMealOn && 'opacity-50')}>
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
            {!isMealSaved &&
              adapters.renderMealCard({
                title: MEAL_TYPE_LABEL[type],
                dishes,
                onPress: editDishes,
              })}
            {isMealSaved && <p className="text-[15px] text-emerald-700">식단은 기록했어요</p>}
            {willLinkPurchases && (
              <dl className="flex flex-col gap-1.5">
                {savablePurchaseLinks.map((link) => (
                  <ReceiptRow
                    key={`${link.dish_name}-${link.purchase_index}`}
                    label={link.dish_name}
                    value={`새로 산 ${purchases[link.purchase_index]?.name ?? ''}${link.amount > 0 ? ` ${link.amount}개` : ''}`}
                  />
                ))}
              </dl>
            )}
            {isMealOn && !isMealSaved && (
              <VoiceDishChoices
                result={result}
                linkedDishNames={linkedDishNames}
                onSearchFridgeItem={adapters.searchFridgeItem}
              />
            )}
            <SynonymOfferBanner />
            {outDishes.length > 0 && (
              <p className="text-[15px] leading-relaxed break-keep text-gray-500">
                {outDishes.map((dish) => dish.name).join(', ')}:{' '}
                {expense ? MESSAGE.outMenu : MESSAGE.outMenuNoExpense}
              </p>
            )}
            {result.shortages.map((shortage) => (
              <p
                key={shortage.name}
                className="text-[15px] leading-relaxed break-keep text-amber-700"
              >
                {shortage.name}은 {shortage.available.toLocaleString('ko-KR')}
                {UNIT_LABEL[shortage.unit]}만 남아 있어요
              </p>
            ))}
          </div>
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
            <div className={cn('flex flex-col gap-2', !isPurchaseOn && 'opacity-50')}>
              {purchases.map((purchase, index) => (
                <div key={index} className="flex flex-col gap-2">
                  <ListItemButton
                    onClick={() => editPurchase(index)}
                    disabled={!isPurchaseOn || isPurchaseSaved}
                  >
                    {adapters.renderPurchaseItem({ purchase })}
                  </ListItemButton>
                  {purchase.candidate_ids && (
                    <CandidateChips
                      label={`'${purchase.name}'은 어떤 품목에 넣을까요?`}
                      itemIds={purchase.candidate_ids}
                      items={result.fridgeItems}
                      onPick={(itemId) => pickPurchaseItem(index, itemId)}
                      extra={{
                        label: '새 품목으로',
                        onPress: () => pickPurchaseItem(index, null),
                      }}
                    />
                  )}
                </div>
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
                savablePurchaseLinks.map((link) => {
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

        {result.unmatched.length > 0 && (
          <ul className="flex flex-col gap-1 text-[15px] leading-relaxed break-keep text-amber-700">
            {result.unmatched.map((entry) => (
              <li key={entry.spoken}>
                {entry.spoken}: {entry.reason}
              </li>
            ))}
          </ul>
        )}

        {(stockUpdates.length > 0 || pendingStockUpdates.length > 0) && (
          <ReviewSection
            title="냉장고 정리"
            toggle={!isStockSaved ? { checked: isStockOn, onChange: setIsStockOn } : undefined}
          >
            <div className={cn('flex flex-col gap-3', !isStockOn && 'opacity-50')}>
              {stockUpdates.length > 0 && (
                <dl className="flex flex-col gap-1.5">
                  {stockUpdates.map((update) => (
                    <ReceiptRow
                      key={update.fridge_item_id}
                      label={update.name}
                      value={formatStockUpdate(update)}
                    />
                  ))}
                </dl>
              )}
              {pendingStockUpdates.map((pending) => (
                <CandidateChips
                  key={pending.id}
                  label={`'${pending.spoken}'은 어떤 품목인가요?`}
                  itemIds={pending.candidate_ids}
                  items={result.fridgeItems}
                  onPick={(itemId) => pickStock(pending.id, itemId)}
                />
              ))}
            </div>
          </ReviewSection>
        )}

        <ReviewSection
          title="외식비"
          toggle={expense ? { checked: isExpenseOn, onChange: setIsExpenseOn } : undefined}
        >
          {expense ? (
            <div className={cn('flex flex-col gap-2', !isExpenseOn && 'opacity-50')}>
              <ListItemButton onClick={editExpense} disabled={!isExpenseOn}>
                {adapters.renderExpenseItem({ expense })}
              </ListItemButton>
              {isBrandMissing && (
                <p className="text-[15px] break-keep text-red-600">{MESSAGE.brandRequired}</p>
              )}
              {expenseError && (
                <p role="alert" className="text-[15px] break-keep text-red-600">
                  {expenseError}
                </p>
              )}
            </div>
          ) : (
            <p className="text-[15px] break-keep text-gray-500">{MESSAGE.noExpense}</p>
          )}
        </ReviewSection>

        {purchaseTotal + expenseTotal > 0 && (
          <dl className="flex flex-col gap-1.5 border-t border-dashed border-gray-300 pt-4">
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
        {skippedCount > 0 && (
          <p className="text-[15px] break-keep text-amber-700">
            {skippedCount}개는 고르지 않아 빠져요
          </p>
        )}
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
  children: ReactNode;
}

/** 묶음 하나 — 제목 줄과 기록 여부 스위치, 그 아래 목록 */
function ReviewSection({ title, toggle, children }: ReviewSectionProps) {
  return (
    <section className="flex flex-col gap-3">
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

/** 영수증 추가 목록, 식비 내역과 같은 테두리 줄. 누르면 편집 화면이 열린다 */
function ListItemButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full flex-col gap-0.5 rounded-lg border bg-white px-3 py-2.5 text-left transition-colors active:bg-gray-50"
    >
      {children}
    </button>
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
  if (purchase.unit !== 'count') {
    return usageStatus === 'depleted'
      ? `${bought} → 0${unit}`
      : `${bought} 그대로 (썼다고만 남겨요)`;
  }
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
