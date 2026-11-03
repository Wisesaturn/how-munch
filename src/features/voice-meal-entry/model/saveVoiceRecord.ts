import { apiClient } from '@/commons/lib';

import { type ParsedPurchase, type PurchaseLink, type StockUpdate } from '../lib';

import { type VoiceDraftDish } from './saveVoiceMeal';

interface SavedIngredient {
  linked_fridge_item_id: string | null;
}

interface FridgeItemForLink {
  id: string;
  fridge_item_batches: Array<{
    id: string;
    purchased_date: string;
    quantity: number | string;
    deleted_at: string | null;
  }>;
}

/**
 * @description 장보기 한 줄을 기존 장보기 추가 경로로 저장한다. 장보기 내역과 냉장고 입고가 함께 생기고,
 * 같은 이름과 브랜드의 냉장고 품목이 있으면 그 품목의 새 구매분이 된다. 연결된 냉장고 품목 id를 돌려준다.
 */
export async function saveVoicePurchase(input: {
  householdId: string;
  date: string;
  store: string;
  purchase: ParsedPurchase;
}): Promise<string | null> {
  const { purchase } = input;
  const saved = await apiClient.post<SavedIngredient>('/api/ingredients', {
    household_id: input.householdId,
    date: input.date,
    category_id: purchase.category_id,
    name: purchase.name.trim(),
    brand: purchase.brand.trim() || null,
    count: purchase.count,
    unit: purchase.unit,
    store: (purchase.store ?? input.store).trim() || null,
    price: purchase.price,
    batches: toBatchInputs(purchase),
  });
  return saved?.linked_fridge_item_id ?? null;
}

/** 장보기 추가 경로의 batches 값 — 영수증 추가 화면과 같은 규칙이다 */
function toBatchInputs(purchase: ParsedPurchase) {
  if (purchase.batches && purchase.batches.length > 0) {
    return purchase.batches.map(({ quantity, expiry_date }) => ({ quantity, expiry_date }));
  }
  if (purchase.expiry_date === undefined) return undefined;
  return [{ quantity: purchase.count, expiry_date: purchase.expiry_date }];
}

/** @description 재고만 바꾸는 말을 저장한다. 버림은 품목 전체를 0으로, 남은 수량은 구매분마다 고친다 */
export async function saveVoiceStockUpdate(update: StockUpdate) {
  if (update.action === 'discard') {
    await apiClient.post('/api/fridge/discard', { id: update.fridge_item_id });
    return;
  }
  for (const batch of update.batches) {
    await apiClient.put('/api/fridge/batches', {
      id: batch.batch_id,
      current_quantity: batch.current_quantity,
    });
  }
}

/**
 * @description 이번에 산 재료를 메뉴 재료로 붙인다. 장보기를 저장해 생긴 냉장고 품목에서
 * 남아 있는 구매분 중 가장 최근 것을 새 구매분으로 보고 잇는다. 메뉴가 없으면 새로 만든다.
 */
export async function attachPurchaseLinks(input: {
  householdId: string;
  dishes: VoiceDraftDish[];
  links: PurchaseLink[];
  purchases: ParsedPurchase[];
  fridgeItemIdByPurchase: Array<string | null>;
}): Promise<VoiceDraftDish[]> {
  const links = input.links.filter((link) => input.fridgeItemIdByPurchase[link.purchase_index]);
  if (links.length === 0) return input.dishes;

  const items = await apiClient.get<FridgeItemForLink[]>('/api/meals/fridge-items', {
    householdId: input.householdId,
  });
  const itemById = new Map(items.map((item) => [item.id, item]));
  const dishes = input.dishes.map((dish) => ({ ...dish, ingredients: [...dish.ingredients] }));

  for (const link of links) {
    const fridgeItemId = input.fridgeItemIdByPurchase[link.purchase_index]!;
    const newestBatch = itemById
      .get(fridgeItemId)
      ?.fridge_item_batches.filter(
        (batch) => batch.deleted_at === null && Number(batch.quantity) > 0,
      )
      .sort((a, b) => a.purchased_date.localeCompare(b.purchased_date))
      .at(-1);
    if (!newestBatch) continue;

    const ingredient = {
      fridge_item_id: fridgeItemId,
      batch_id: newestBatch.id,
      amount: link.amount,
      usage_status: link.usage_status,
      unit: input.purchases[link.purchase_index].unit,
    };
    const dish = dishes.find((candidate) => candidate.name.trim() === link.dish_name);
    if (dish) dish.ingredients.push(ingredient);
    else dishes.push({ name: link.dish_name, ingredients: [ingredient] });
  }
  return dishes;
}
