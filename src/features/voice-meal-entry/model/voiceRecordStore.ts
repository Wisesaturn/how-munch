import { create } from 'zustand';

import { type MealType } from '@/entities/meal';

import {
  allocateIngredient,
  applyPurchaseItem,
  mergeIngredientRows,
  toStockUpdate,
  type ParsedExpense,
  type ParsedMealResult,
  type ParsedPurchase,
  type PendingIngredient,
  type PendingStockUpdate,
  type StockUpdate,
  type VoiceFridgeItem,
} from '../lib';

import { toDraftDishes, type VoiceDraftDish } from './saveVoiceMeal';

/** 못 찾았던 말을 직접 연결한 뒤 유사어로 기억할지 묻는 제안 */
export interface SynonymOffer {
  baseTerm: string;
  itemName: string;
}

/** 재료를 고른 결과. 재고가 모자라면 남은 수량, 고를 재고가 없으면 isEmpty */
interface PickResult {
  available: number | null;
  isEmpty: boolean;
}

interface VoiceRecordState {
  /** 정리 결과. 결과 화면이 열려 있는 동안만 있다 */
  result: ParsedMealResult | null;
  type: MealType;
  dishes: VoiceDraftDish[];
  purchases: ParsedPurchase[];
  expense: ParsedExpense | null;
  pendingIngredients: PendingIngredient[];
  stockUpdates: StockUpdate[];
  pendingStockUpdates: PendingStockUpdate[];
  synonymOffer: SynonymOffer | null;
  isMealOn: boolean;
  isPurchaseOn: boolean;
  isStockOn: boolean;
  isExpenseOn: boolean;
  /** 새 정리 결과로 결과 화면 상태를 처음부터 다시 잡는다 */
  start: (result: ParsedMealResult) => void;
  update: (patch: Partial<VoiceRecordValues>) => void;
  /** 고를 항목의 재료를 품목으로 정해 메뉴에 넣는다 */
  pickIngredient: (pendingId: string, itemId: string) => PickResult;
  /** 메뉴에 품목 재료를 더하거나 뺀다. 추천 재료와 직접 찾은 재료가 쓴다 */
  addIngredient: (dishName: string, itemId: string, spoken: string) => PickResult;
  removeIngredient: (dishName: string, itemId: string) => void;
  /** 재고 정리의 품목을 정한다. 적용할 수 없으면 이유를 돌려준다 */
  pickStockItem: (pendingId: string, itemId: string) => string | null;
  /** 장보기의 품목을 정한다. itemId가 null이면 새 품목으로 둔다 */
  pickPurchaseItem: (index: number, itemId: string | null) => void;
  reset: () => void;
}

type VoiceRecordValues = Omit<
  VoiceRecordState,
  | 'result'
  | 'start'
  | 'update'
  | 'reset'
  | 'pickIngredient'
  | 'addIngredient'
  | 'removeIngredient'
  | 'pickStockItem'
  | 'pickPurchaseItem'
>;

const EMPTY = {
  result: null,
  type: 'snack' as MealType,
  dishes: [],
  purchases: [],
  expense: null,
  pendingIngredients: [],
  stockUpdates: [],
  pendingStockUpdates: [],
  synonymOffer: null,
  isMealOn: false,
  isPurchaseOn: false,
  isStockOn: false,
  isExpenseOn: false,
};

/**
 * @description 음성 기록 결과 화면의 상태(정리 결과와 고친 값)를 담는 전역 스토어.
 * history-sync가 Activity params를 URL로 바꿔 객체가 깨지므로, 영수증 추가 화면처럼 결과는 스토어에 두고
 * 편집 화면을 다녀와 결과 화면이 다시 그려져도 고친 값이 남게 한다.
 */
export const useVoiceRecordStore = create<VoiceRecordState>((set, get) => ({
  ...EMPTY,

  start(rawResult) {
    const result = normalizeParsedMealResult(rawResult);
    const dishes = toDraftDishes(result.dishes);
    set({
      result,
      type: result.type,
      dishes,
      purchases: result.purchases.map((purchase) => ({
        ...purchase,
        store: purchase.store ?? result.purchaseStore,
      })),
      expense: result.expense,
      pendingIngredients: result.pendingIngredients,
      stockUpdates: result.stockUpdates,
      pendingStockUpdates: result.pendingStockUpdates,
      synonymOffer: null,
      isMealOn: dishes.length > 0 || result.purchaseLinks.length > 0,
      isPurchaseOn: result.purchases.length > 0,
      isStockOn: result.stockUpdates.length > 0 || result.pendingStockUpdates.length > 0,
      isExpenseOn: result.expense !== null,
    });
  },

  update(patch) {
    set(patch);
  },

  pickIngredient(pendingId, itemId) {
    const { pendingIngredients, dishes, result } = get();
    const pending = pendingIngredients.find((candidate) => candidate.id === pendingId);
    const item = result?.fridgeItems.find((candidate) => candidate.id === itemId);
    if (!pending || !item) return { available: null, isEmpty: true };

    const { dishes: nextDishes, picked } = addToDish(dishes, pending.dish_name, item, pending);
    if (picked.isEmpty) return picked;

    set({
      dishes: nextDishes,
      pendingIngredients: pendingIngredients.filter((candidate) => candidate.id !== pendingId),
      synonymOffer:
        pending.reason === 'none' && pending.spoken !== item.name
          ? { baseTerm: pending.spoken, itemName: item.name }
          : null,
    });
    return picked;
  },

  addIngredient(dishName, itemId, spoken) {
    const { dishes, result } = get();
    const item = result?.fridgeItems.find((candidate) => candidate.id === itemId);
    if (!item) return { available: null, isEmpty: true };

    const { dishes: nextDishes, picked } = addToDish(dishes, dishName, item, {
      spoken,
      amount: null,
      depleted: false,
    });
    if (!picked.isEmpty) set({ dishes: nextDishes });
    return picked;
  },

  removeIngredient(dishName, itemId) {
    set({
      dishes: get().dishes.map((dish) =>
        dish.name === dishName
          ? {
              ...dish,
              ingredients: dish.ingredients.filter(
                (ingredient) => ingredient.fridge_item_id !== itemId,
              ),
            }
          : dish,
      ),
    });
  },

  pickStockItem(pendingId, itemId) {
    const { pendingStockUpdates, stockUpdates, result } = get();
    const pending = pendingStockUpdates.find((candidate) => candidate.id === pendingId);
    const item = result?.fridgeItems.find((candidate) => candidate.id === itemId);
    if (!pending || !item) return null;

    const resolved = toStockUpdate(item, pending);
    if (!resolved) return null;
    if ('reason' in resolved) return resolved.reason;
    const isDuplicate = stockUpdates.some((update) => update.fridge_item_id === item.id);
    set({
      stockUpdates: isDuplicate ? stockUpdates : [...stockUpdates, resolved.update],
      pendingStockUpdates: pendingStockUpdates.filter((candidate) => candidate.id !== pendingId),
    });
    return null;
  },

  pickPurchaseItem(index, itemId) {
    const { purchases, result } = get();
    const item = result?.fridgeItems.find((candidate) => candidate.id === itemId);
    set({
      purchases: purchases.map((purchase, purchaseIndex) => {
        if (purchaseIndex !== index) return purchase;
        return item
          ? applyPurchaseItem(purchase, item)
          : { ...purchase, fridge_item_id: null, candidate_ids: undefined };
      }),
    });
  },

  reset() {
    set(EMPTY);
  },
}));

/** 끼니 전체에서 구매분마다 이미 잡은 개 단위 수량 */
function collectUsedByBatch(dishes: VoiceDraftDish[]) {
  const usedByBatch = new Map<string, number>();
  for (const { batch_id, amount } of dishes.flatMap((dish) => dish.ingredients)) {
    usedByBatch.set(batch_id, (usedByBatch.get(batch_id) ?? 0) + amount);
  }
  return usedByBatch;
}

/** 품목을 구매분별 줄로 나눠 메뉴에 합친다. 잡을 재고가 없으면 메뉴를 그대로 돌려준다 */
function addToDish(
  dishes: VoiceDraftDish[],
  dishName: string,
  item: VoiceFridgeItem,
  input: { spoken: string; amount: number | null; depleted: boolean },
): { dishes: VoiceDraftDish[]; picked: PickResult } {
  const { rows, available } = allocateIngredient(item, input, collectUsedByBatch(dishes));
  if (rows.length === 0) return { dishes, picked: { available, isEmpty: true } };

  const draftRows = rows.map(({ fridge_item_id, batch_id, amount, usage_status, unit }) => ({
    fridge_item_id,
    batch_id,
    amount,
    usage_status,
    unit,
  }));
  return {
    dishes: dishes.map((dish) =>
      dish.name === dishName
        ? { ...dish, ingredients: mergeIngredientRows(dish.ingredients, draftRows) }
        : dish,
    ),
    picked: { available, isEmpty: false },
  };
}

/** 서버 응답에 빠진 목록이 있어도 화면이 깨지지 않게 빈 값으로 채운다 */
function normalizeParsedMealResult(result: ParsedMealResult): ParsedMealResult {
  return {
    ...result,
    dishes: result.dishes ?? [],
    unmatched: result.unmatched ?? [],
    pendingIngredients: result.pendingIngredients ?? [],
    suggestions: result.suggestions ?? [],
    shortages: result.shortages ?? [],
    pendingStockUpdates: result.pendingStockUpdates ?? [],
    stock: result.stock ?? [],
    expense: result.expense ?? null,
    purchases: result.purchases ?? [],
    purchaseStore: result.purchaseStore ?? '',
    purchaseLinks: result.purchaseLinks ?? [],
    stockUpdates: result.stockUpdates ?? [],
    summary: result.summary ?? '',
    fridgeItems: result.fridgeItems ?? [],
    categories: result.categories ?? [],
  };
}
