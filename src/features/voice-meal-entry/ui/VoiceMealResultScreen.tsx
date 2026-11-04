'use client';

import { type ReactNode, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { josa } from 'es-hangul';
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
  syncPurchaseLink,
  type ParsedExpense,
  type ParsedMealResult,
  type ParsedPurchase,
  type StockPreview,
  type StockUpdate,
  type VoiceUnit,
} from '../lib';
import {
  useVoiceRecordStore,
  saveVoiceRecord,
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
  saveFailed: '기록하지 못했어요. 아무것도 저장되지 않았으니 다시 저장해 주세요',
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
    purchaseLinks,
    stockUpdates,
    pendingStockUpdates,
    changeDishes,
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
  const savableDishes = toSavableDishes(dishes);
  const stock = buildStockPreview(savableDishes, itemById);
  /** 저장할 메뉴 연결. 품목을 고르지 않은 장보기는 빼고, 고친 장보기 값에 수량을 맞춘다 */
  const savablePurchaseLinks = isPurchaseOn
    ? purchaseLinks.flatMap((link) => {
        const purchase = purchases[link.purchase_index];
        return purchase && !purchase.candidate_ids ? [syncPurchaseLink(link, purchase)] : [];
      })
    : [];
  const linkedDishNames = new Set(savablePurchaseLinks.map((link) => link.dish_name));
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

  const savablePurchaseCount = purchases.length - unpickedPurchases.length;
  const willSavePurchases = isPurchaseOn && savablePurchaseCount > 0;
  const willLinkPurchases = savablePurchaseLinks.length > 0;

  const willSaveStock = isStockOn && stockUpdates.length > 0;

  const willSaveExpense = expense !== null && isExpenseOn;
  const isBrandMissing = willSaveExpense && !expense.brand.trim();

  const willSaveMeal = (savableDishes.length > 0 || willLinkPurchases) && isMealOn;
  const purchaseTotal = willSavePurchases
    ? sumPrices(purchases.filter((purchase) => !purchase.candidate_ids))
    : 0;
  const expenseTotal = willSaveExpense ? expense.price : 0;
  const [isSaving, setIsSaving] = useState(false);

  function editDishes() {
    adapters.editDishes({
      title: `${dateLabel} ${MEAL_TYPE_LABEL[type]} 식단`,
      dishes,
      onDone: changeDishes,
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
      onDone: (nextExpense) => update({ expense: nextExpense }),
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

  /** 켜 둔 묶음을 한 번에 저장한다. 실패하면 전부 취소되므로 고친 값을 그대로 두고 다시 저장하게 한다 */
  async function save() {
    if (isBrandMissing) {
      Toast.warn(MESSAGE.brandRequired);
      editExpense();
      return;
    }

    setIsSaving(true);
    try {
      await saveVoiceRecord({
        householdId,
        date: result.date,
        type,
        purchaseStore: result.purchaseStore,
        dishes: isMealOn ? savableDishes : null,
        purchases: isPurchaseOn ? purchases : null,
        purchaseLinks: savablePurchaseLinks,
        stockUpdates: isStockOn ? stockUpdates : null,
        expense: willSaveExpense ? expense : null,
      });
    } catch (error) {
      Toast.error(error instanceof Error ? error.message : MESSAGE.saveFailed);
      setIsSaving(false);
      return;
    }

    invalidate();
    const done = [
      willSavePurchases && `장보기 ${savablePurchaseCount}건`,
      willSaveStock && '냉장고 정리',
      willSaveMeal && `${dateLabel} ${MEAL_TYPE_LABEL[type]} 식단`,
      willSaveExpense && `외식비 ${expense.price.toLocaleString('ko-KR')}원`,
    ].filter(Boolean);
    Toast.success(`${josa(done.join(', '), '을/를')} 기록했어요`);
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

        <ReviewSection title="식단" toggle={{ checked: isMealOn, onChange: setIsMealOn }}>
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
            {adapters.renderMealCard({
              title: MEAL_TYPE_LABEL[type],
              dishes,
              onPress: editDishes,
            })}
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
            {isMealOn && (
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
                {josa(shortage.name, '은/는')} {shortage.available.toLocaleString('ko-KR')}
                {UNIT_LABEL[shortage.unit]}만 남아 있어요
              </p>
            ))}
          </div>
        </ReviewSection>

        <ReviewSection
          title="장보기"
          toggle={
            purchases.length > 0 ? { checked: isPurchaseOn, onChange: setIsPurchaseOn } : undefined
          }
        >
          {purchases.length === 0 ? (
            <p className="text-[15px] break-keep text-gray-500">{MESSAGE.noPurchase}</p>
          ) : (
            <div className={cn('flex flex-col gap-2', !isPurchaseOn && 'opacity-50')}>
              {purchases.map((purchase, index) => (
                <div key={index} className="flex flex-col gap-2">
                  <ListItemButton onClick={() => editPurchase(index)} disabled={!isPurchaseOn}>
                    {adapters.renderPurchaseItem({ purchase })}
                  </ListItemButton>
                  {purchase.candidate_ids && (
                    <CandidateChips
                      label={`${josa(purchase.name, '은/는')} 어떤 품목에 넣을까요?`}
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
            toggle={{ checked: isStockOn, onChange: setIsStockOn }}
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
                  label={`${josa(pending.spoken, '은/는')} 어떤 품목인가요?`}
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
