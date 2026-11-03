import { create } from 'zustand';

import { type MealType } from '@/entities/meal';

import { type ParsedExpense, type ParsedMealResult, type ParsedPurchase } from '../lib';

import { toDraftDishes, type VoiceDraftDish } from './saveVoiceMeal';

interface VoiceRecordState {
  /** 정리 결과. 결과 화면이 열려 있는 동안만 있다 */
  result: ParsedMealResult | null;
  type: MealType;
  dishes: VoiceDraftDish[];
  purchases: ParsedPurchase[];
  expense: ParsedExpense | null;
  isMealOn: boolean;
  isPurchaseOn: boolean;
  isStockOn: boolean;
  isExpenseOn: boolean;
  /** 새 정리 결과로 결과 화면 상태를 처음부터 다시 잡는다 */
  start: (result: ParsedMealResult) => void;
  update: (patch: Partial<Omit<VoiceRecordState, 'result' | 'start' | 'update' | 'reset'>>) => void;
  reset: () => void;
}

const EMPTY = {
  result: null,
  type: 'snack' as MealType,
  dishes: [],
  purchases: [],
  expense: null,
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
export const useVoiceRecordStore = create<VoiceRecordState>((set) => ({
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
      isMealOn: dishes.length > 0 || result.purchaseLinks.length > 0,
      isPurchaseOn: result.purchases.length > 0,
      isStockOn: result.stockUpdates.length > 0,
      isExpenseOn: result.expense !== null,
    });
  },

  update(patch) {
    set(patch);
  },

  reset() {
    set(EMPTY);
  },
}));

/** 서버 응답에 빠진 목록이 있어도 화면이 깨지지 않게 빈 값으로 채운다 */
function normalizeParsedMealResult(result: ParsedMealResult): ParsedMealResult {
  return {
    ...result,
    dishes: result.dishes ?? [],
    unmatched: result.unmatched ?? [],
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
