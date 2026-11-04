import { type ParsedExpense } from './parseMeal';
import { type ParsedPurchase, type PurchaseLink, type StockUpdate } from './parseExtras';

interface PayloadDish {
  name: string;
  ingredients: Array<{
    fridge_item_id: string;
    batch_id: string;
    amount: number;
    usage_status: 'used' | 'depleted';
  }>;
}

export interface VoiceRecordPayloadInput {
  householdId: string;
  date: string;
  type: string;
  /** 장보기 가게 이름. 품목별 가게가 없을 때 쓴다 */
  purchaseStore: string;
  /** 스위치를 끈 묶음은 null로 넘긴다 */
  dishes: PayloadDish[] | null;
  purchases: ParsedPurchase[] | null;
  purchaseLinks: PurchaseLink[];
  stockUpdates: StockUpdate[] | null;
  expense: ParsedExpense | null;
}

/** 장보기 저장의 batches 값 — 영수증 추가 화면과 같은 규칙이다 */
function toBatchInputs(purchase: ParsedPurchase) {
  if (purchase.batches && purchase.batches.length > 0) {
    return purchase.batches.map(({ quantity, expiry_date }) => ({ quantity, expiry_date }));
  }
  if (purchase.expiry_date === undefined) return undefined;
  return [{ quantity: purchase.count, expiry_date: purchase.expiry_date }];
}

/**
 * @description 결과 화면의 값을 음성 기록 저장 요청으로 바꾼다.
 * 품목을 고르지 않은 장보기는 빼고, 남은 장보기 순서에 맞춰 메뉴 연결의 번호를 다시 매긴다.
 * 장보기나 식단을 끄면 산 재료를 메뉴에 잇는 줄도 함께 뺀다.
 */
export function buildVoiceRecordPayload(input: VoiceRecordPayloadInput) {
  const purchases = input.purchases ?? [];
  const savedIndexByOriginal = new Map<number, number>();
  const savedPurchases = purchases.flatMap((purchase, index) => {
    if (purchase.candidate_ids) return [];
    savedIndexByOriginal.set(index, savedIndexByOriginal.size);
    return [
      {
        name: purchase.name.trim(),
        brand: purchase.brand.trim() || null,
        category_id: purchase.category_id,
        count: purchase.count,
        unit: purchase.unit,
        store: (purchase.store ?? input.purchaseStore).trim() || null,
        price: purchase.price,
        batches: toBatchInputs(purchase),
      },
    ];
  });

  const links = input.dishes
    ? input.purchaseLinks.flatMap((link) => {
        const purchaseIndex = savedIndexByOriginal.get(link.purchase_index);
        return purchaseIndex === undefined ? [] : [{ ...link, purchase_index: purchaseIndex }];
      })
    : [];

  return {
    householdId: input.householdId,
    date: input.date,
    type: input.type,
    purchases: savedPurchases,
    stockUpdates: (input.stockUpdates ?? []).map(({ action, fridge_item_id, batches }) => ({
      action,
      fridge_item_id,
      batches,
    })),
    dishes: (input.dishes ?? []).map(({ name, ingredients }) => ({
      name,
      ingredients: ingredients.map(({ fridge_item_id, batch_id, amount, usage_status }) => ({
        fridge_item_id,
        batch_id,
        amount,
        usage_status,
      })),
    })),
    purchaseLinks: links,
    expense: input.expense && {
      kind: input.expense.kind,
      brand: input.expense.brand.trim(),
      name: input.expense.name.trim() || null,
      store: input.expense.kind === 'delivery' ? input.expense.store.trim() || null : null,
      price: input.expense.price,
      date: input.expense.date,
      memo: input.expense.memo?.trim() || null,
    },
  };
}

export type VoiceRecordPayload = ReturnType<typeof buildVoiceRecordPayload>;
