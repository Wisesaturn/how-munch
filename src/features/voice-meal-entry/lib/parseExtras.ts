import { type VoiceFridgeItem, type VoiceItemMatcher, type VoiceUnit } from './parseMeal';

/** 장보기 분류. ingredient_categories의 id, code, 이름 */
export interface VoiceCategory {
  id: string;
  code: string;
  label: string;
}

/** 말로 정리한 장보기 한 줄. 저장하면 장보기 내역과 냉장고 입고가 함께 생긴다 */
export interface ParsedPurchase {
  name: string;
  brand: string;
  category_id: string;
  unit: VoiceUnit;
  /** 개 단위면 개수, g/kg/ml/L면 그 단위의 양 */
  count: number;
  price: number;
  /** 냉장고에 같은 품목이 있으면 그 id. 저장하면 이 품목의 새 구매분으로 들어간다 */
  fridge_item_id: string | null;
  /** 같은 품목인지 사용자가 골라야 할 때의 후보. 고르면 비운다 */
  candidate_ids?: string[];
  /** 품목별 가게. 없으면 장보기 가게(purchaseStore)를 쓴다 */
  store?: string;
  /** 편집 화면에서 정한 유통기한. undefined면 분류 기본값, null이면 유통기한 없음 */
  expiry_date?: string | null;
  /** 편집 화면에서 나눈 재고 묶음 */
  batches?: Array<{ id: string; quantity: number; expiry_date: string | null }>;
}

/** 같은 문장에서 산 재료를 바로 메뉴에 쓴 것. 장보기를 저장한 뒤 새 구매분으로 잇는다 */
export interface PurchaseLink {
  dish_name: string;
  purchase_index: number;
  /** 개 단위: 쓴 개수. g/kg/ml/L: 0 */
  amount: number;
  usage_status: 'used' | 'depleted';
}

/** 식단과 상관없이 재고만 바꾸는 말("우유 버렸어", "계란 3개 남았어") */
export interface StockUpdate {
  fridge_item_id: string;
  name: string;
  unit: VoiceUnit;
  /** discard: 전부 버림/다 먹음, set_remaining: 남은 수량으로 맞춤 */
  action: 'discard' | 'set_remaining';
  before: number;
  after: number;
  /** set_remaining일 때 구매분마다 바꿀 남은 수량. 오래된 구매분부터 줄인다 */
  batches: Array<{ batch_id: string; current_quantity: number }>;
  spoken: string;
}

/** 후보가 여러 건이라 사용자가 품목을 골라야 하는 재고 정리 */
export interface PendingStockUpdate {
  id: string;
  spoken: string;
  action: StockUpdate['action'];
  remaining: number | null;
  candidate_ids: string[];
}

const UNITS: VoiceUnit[] = ['count', 'g', 'kg', 'ml', 'l'];
const NAME_MAX = 30;
const PRICE_MAX = 100_000_000;

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** 개 단위는 1 이상 정수, 무게·부피는 0보다 큰 수. 알 수 없으면 1 */
function resolveCount(rawCount: number, unit: VoiceUnit) {
  if (!Number.isFinite(rawCount) || rawCount <= 0) return 1;
  return unit === 'count' ? Math.max(1, Math.round(rawCount)) : rawCount;
}

function activeBatches(item: VoiceFridgeItem) {
  return item.batches
    .filter((batch) => batch.quantity > 0)
    .sort((a, b) => a.purchased_date.localeCompare(b.purchased_date));
}

/** 단위를 바꿔 양을 환산한다. 개와 무게, 무게와 부피처럼 환산할 수 없으면 null */
function convertQuantity(quantity: number, from: VoiceUnit, to: VoiceUnit): number | null {
  if (from === to) return quantity;
  if ((from === 'kg' && to === 'g') || (from === 'l' && to === 'ml')) return quantity * 1000;
  if ((from === 'g' && to === 'kg') || (from === 'ml' && to === 'l')) return quantity / 1000;
  return null;
}

function canApplyPurchaseItem(purchase: ParsedPurchase, item: VoiceFridgeItem) {
  return convertQuantity(purchase.count, purchase.unit, item.unit) !== null;
}

/**
 * @description 장보기 한 줄을 고른 냉장고 품목에 맞춘다. 이름과 브랜드, 단위, 분류를 품목과 같게 해야 저장할 때 같은 품목으로 합쳐진다.
 * 양은 품목 단위로 환산한다. 환산할 수 없는 품목은 후보에서 미리 빼므로 여기 오면 새 품목으로 둔다.
 */
export function applyPurchaseItem(purchase: ParsedPurchase, item: VoiceFridgeItem): ParsedPurchase {
  const count = convertQuantity(purchase.count, purchase.unit, item.unit);
  if (count === null) return { ...purchase, fridge_item_id: null, candidate_ids: undefined };
  return {
    ...purchase,
    name: item.name.slice(0, NAME_MAX),
    brand: (item.brand ?? '').slice(0, NAME_MAX),
    unit: item.unit,
    count,
    category_id: item.category_id,
    fridge_item_id: item.id,
    candidate_ids: undefined,
  };
}

/**
 * @description Claude가 뽑은 장보기를 저장할 모양으로 바꾼다.
 * 이름 전체가 같은 품목이 하나면 그 품목의 새 구매분으로 잇는다. 부분일치로 걸린 품목은 다른 상품일 수 있어
 * ("우유"를 샀는데 "딸기우유"에 입고) 자동으로 잇지 않고 후보로 남겨 고르거나 새 품목으로 두게 한다.
 * 개 단위로 산 것을 ml 품목에 넣는 것처럼 환산할 수 없는 품목에는 잇지 않는다.
 * 분류 코드가 목록에 없으면 "기타"(code etc), 그것도 없으면 첫 분류로 둔다.
 */
export function resolvePurchases(
  rawPurchases: unknown,
  matchItem: VoiceItemMatcher,
  categories: VoiceCategory[],
): ParsedPurchase[] {
  if (!Array.isArray(rawPurchases) || categories.length === 0) return [];
  const fallbackCategory = categories.find((category) => category.code === 'etc') ?? categories[0];

  return rawPurchases.flatMap((rawPurchase: unknown) => {
    if (typeof rawPurchase !== 'object' || rawPurchase === null) return [];
    const record = rawPurchase as Record<string, unknown>;
    const spokenName = asText(record.name);
    const name = spokenName.slice(0, NAME_MAX);
    if (!name) return [];

    const rawUnit = asText(record.unit) as VoiceUnit;
    const unit = UNITS.includes(rawUnit) ? rawUnit : 'count';
    const rawPrice = Math.round(Number(record.price));
    const price = Number.isFinite(rawPrice) && rawPrice > 0 && rawPrice <= PRICE_MAX ? rawPrice : 0;
    const category =
      categories.find((candidate) => candidate.code === asText(record.category_code)) ??
      fallbackCategory;
    const purchase: ParsedPurchase = {
      name,
      brand: asText(record.brand).slice(0, NAME_MAX),
      category_id: category.id,
      unit,
      count: resolveCount(Number(record.count), unit),
      price,
      fridge_item_id: null,
    };

    const match = matchItem(`${purchase.brand}${name}`);
    if (match.best && match.isWhole && canApplyPurchaseItem(purchase, match.best)) {
      return [applyPurchaseItem(purchase, match.best)];
    }
    const candidates = match.candidates.filter((item) => canApplyPurchaseItem(purchase, item));
    if (candidates.length > 0) {
      return [{ ...purchase, candidate_ids: candidates.map((item) => item.id) }];
    }
    return [purchase];
  });
}

/**
 * @description 메뉴 재료 중 "이번에 산 것"을 가리키는 줄을 모은다.
 * 개 단위는 말한 개수(없으면 1)를 산 개수 안으로 줄인다.
 */
export function collectPurchaseLinks(
  rawDishes: unknown,
  purchases: ParsedPurchase[],
): PurchaseLink[] {
  if (!Array.isArray(rawDishes)) return [];
  const usedByPurchase = new Map<number, number>();

  return rawDishes.flatMap((rawDish: unknown) => {
    if (typeof rawDish !== 'object' || rawDish === null) return [];
    const dish = rawDish as { name?: unknown; ingredients?: unknown };
    const dishName = asText(dish.name).slice(0, 20);
    if (!dishName || !Array.isArray(dish.ingredients)) return [];

    return dish.ingredients.flatMap((rawIngredient: unknown) => {
      if (typeof rawIngredient !== 'object' || rawIngredient === null) return [];
      const record = rawIngredient as Record<string, unknown>;
      // null은 냉장고 재료라는 뜻이다. Number(null)이 0이라 첫 장보기로 잘못 이어지지 않게 숫자만 받는다
      const index = record.purchase_index;
      if (typeof index !== 'number' || !Number.isInteger(index)) return [];
      const purchase = purchases[index];
      if (!purchase) return [];
      const isDepleted = record.depleted === true;

      if (purchase.unit !== 'count') {
        return [
          {
            dish_name: dishName,
            purchase_index: index,
            amount: 0,
            usage_status: isDepleted ? ('depleted' as const) : ('used' as const),
          },
        ];
      }
      const left = purchase.count - (usedByPurchase.get(index) ?? 0);
      const spokenAmount = Math.floor(Number(record.amount));
      const wanted = Number.isFinite(spokenAmount) && spokenAmount > 0 ? spokenAmount : 1;
      const amount = Math.min(isDepleted ? left : wanted, left);
      if (amount <= 0) return [];
      usedByPurchase.set(index, (usedByPurchase.get(index) ?? 0) + amount);
      return [
        {
          dish_name: dishName,
          purchase_index: index,
          amount,
          usage_status: 'used' as const,
        },
      ];
    });
  });
}

/**
 * @description 편집한 장보기 값에 메뉴 연결을 맞춘다. 무게·부피는 썼다고만 남기고, 개 단위는 1개 이상 산 개수 안으로 둔다.
 */
export function syncPurchaseLink(link: PurchaseLink, purchase: ParsedPurchase): PurchaseLink {
  if (purchase.unit !== 'count') return { ...link, amount: 0 };
  const amount = Math.min(Math.max(link.amount, 1), purchase.count);
  return { ...link, amount, usage_status: 'used' };
}

/**
 * @description 품목 하나에 재고만 바꾸는 말을 적용한다. 버림은 품목 전체를 0으로, 남은 수량은 개 단위 품목만 받아
 * 오래된 구매분부터 줄인다. 늘리는 말은 장보기로 보고, 적용할 수 없으면 `reason`을 돌려준다.
 */
export function toStockUpdate(
  item: VoiceFridgeItem,
  input: { action: unknown; remaining: unknown; spoken: string },
): { update: StockUpdate } | { reason: string } | null {
  const { action, spoken } = input;
  const batches = activeBatches(item);
  const before = batches.reduce((sum, batch) => sum + batch.quantity, 0);
  if (before <= 0) return { reason: '이미 남은 재고가 없어요' };
  const base = { fridge_item_id: item.id, name: item.name, unit: item.unit, before, spoken };

  if (action === 'discard') {
    return { update: { ...base, action: 'discard', after: 0, batches: [] } };
  }

  const remaining = Number(input.remaining);
  if (
    action !== 'set_remaining' ||
    input.remaining === null ||
    !Number.isFinite(remaining) ||
    remaining < 0
  ) {
    return null;
  }
  if (item.unit !== 'count') return { reason: '무게·부피 재료는 남은 양을 말로 바꿀 수 없어요' };
  const target = Math.floor(remaining);
  if (target >= before) return { reason: '지금 재고보다 많아요. 산 것이면 장보기로 말해 주세요' };
  if (target === 0) return { update: { ...base, action: 'discard', after: 0, batches: [] } };

  let toRemove = before - target;
  const changed = batches.flatMap((batch) => {
    if (toRemove <= 0) return [];
    const removed = Math.min(batch.quantity, toRemove);
    toRemove -= removed;
    return [{ batch_id: batch.id, current_quantity: batch.quantity - removed }];
  });
  return { update: { ...base, action: 'set_remaining', after: target, batches: changed } };
}

/**
 * @description 재고만 바꾸는 말의 품목을 찾아 구매분 변경으로 바꾼다.
 * 품목이 하나로 좁혀지지 않으면 후보를 남겨 사용자가 고르게 한다.
 */
export function resolveStockUpdates(
  rawUpdates: unknown,
  matchItem: VoiceItemMatcher,
): {
  updates: StockUpdate[];
  pending: PendingStockUpdate[];
  skipped: Array<{ spoken: string; reason: string }>;
} {
  const updates: StockUpdate[] = [];
  const pending: PendingStockUpdate[] = [];
  const skipped: Array<{ spoken: string; reason: string }> = [];
  if (!Array.isArray(rawUpdates)) return { updates, pending, skipped };

  for (const rawUpdate of rawUpdates) {
    if (typeof rawUpdate !== 'object' || rawUpdate === null) continue;
    const record = rawUpdate as Record<string, unknown>;
    const spoken = asText(record.spoken);
    if (!spoken) continue;
    if (record.action !== 'discard' && record.action !== 'set_remaining') continue;

    const match = matchItem(spoken);
    if (match.candidates.length === 0) {
      skipped.push({ spoken, reason: '냉장고에서 찾지 못했어요' });
      continue;
    }
    if (!match.best) {
      const remaining = typeof record.remaining === 'number' ? record.remaining : null;
      pending.push({
        id: `stock:${spoken}:${pending.length}`,
        spoken,
        action: record.action,
        remaining,
        candidate_ids: match.candidates.map((item) => item.id),
      });
      continue;
    }
    if (updates.some((update) => update.fridge_item_id === match.best?.id)) continue;

    const resolved = toStockUpdate(match.best, {
      action: record.action,
      remaining: record.remaining,
      spoken,
    });
    if (!resolved) continue;
    if ('reason' in resolved) skipped.push({ spoken, reason: resolved.reason });
    else updates.push(resolved.update);
  }

  return { updates, pending, skipped };
}
