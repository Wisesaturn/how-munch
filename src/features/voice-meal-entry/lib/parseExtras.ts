import { type VoiceFridgeItem, type VoiceUnit } from './parseMeal';

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

/**
 * @description Claude가 뽑은 장보기를 저장할 모양으로 바꾼다.
 * 냉장고에 같은 품목이 있으면 그 이름과 브랜드, 단위를 써서 저장 때 같은 품목으로 합쳐지게 한다.
 * 분류 코드가 목록에 없으면 "기타"(code etc), 그것도 없으면 첫 분류로 둔다.
 */
export function resolvePurchases(
  rawPurchases: unknown,
  items: VoiceFridgeItem[],
  categories: VoiceCategory[],
): ParsedPurchase[] {
  if (!Array.isArray(rawPurchases) || categories.length === 0) return [];
  const itemById = new Map(items.map((item) => [item.id, item]));
  const fallbackCategory = categories.find((category) => category.code === 'etc') ?? categories[0];

  return rawPurchases.flatMap((rawPurchase: unknown) => {
    if (typeof rawPurchase !== 'object' || rawPurchase === null) return [];
    const record = rawPurchase as Record<string, unknown>;
    const matched = itemById.get(asText(record.fridge_item_id));
    const name = (matched?.name ?? asText(record.name)).slice(0, NAME_MAX);
    if (!name) return [];

    const rawUnit = asText(record.unit) as VoiceUnit;
    const unit = matched?.unit ?? (UNITS.includes(rawUnit) ? rawUnit : 'count');
    const count = resolveCount(Number(record.count), unit);
    const rawPrice = Math.round(Number(record.price));
    const price = Number.isFinite(rawPrice) && rawPrice > 0 && rawPrice <= PRICE_MAX ? rawPrice : 0;
    const category =
      categories.find((candidate) => candidate.code === asText(record.category_code)) ??
      fallbackCategory;

    return [
      {
        name,
        brand: (matched ? (matched.brand ?? '') : asText(record.brand)).slice(0, NAME_MAX),
        category_id: category.id,
        unit,
        count,
        price,
        fridge_item_id: matched?.id ?? null,
      },
    ];
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
      const index = Number(record.purchase_index);
      const purchase = Number.isInteger(index) ? purchases[index] : undefined;
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
        { dish_name: dishName, purchase_index: index, amount, usage_status: 'used' as const },
      ];
    });
  });
}

/**
 * @description 재고만 바꾸는 말을 구매분 변경으로 바꾼다.
 * 버림은 품목 전체를 0으로, 남은 수량은 개 단위 품목만 받아 오래된 구매분부터 줄인다. 늘리는 말은 장보기로 본다.
 */
export function resolveStockUpdates(
  rawUpdates: unknown,
  items: VoiceFridgeItem[],
): { updates: StockUpdate[]; skipped: Array<{ spoken: string; reason: string }> } {
  const updates: StockUpdate[] = [];
  const skipped: Array<{ spoken: string; reason: string }> = [];
  if (!Array.isArray(rawUpdates)) return { updates, skipped };
  const itemById = new Map(items.map((item) => [item.id, item]));

  for (const rawUpdate of rawUpdates) {
    if (typeof rawUpdate !== 'object' || rawUpdate === null) continue;
    const record = rawUpdate as Record<string, unknown>;
    const spoken = asText(record.spoken);
    const item = itemById.get(asText(record.fridge_item_id));
    if (!item) {
      if (spoken) skipped.push({ spoken, reason: '냉장고에서 찾지 못했어요' });
      continue;
    }
    if (updates.some((update) => update.fridge_item_id === item.id)) continue;

    const batches = activeBatches(item);
    const before = batches.reduce((sum, batch) => sum + batch.quantity, 0);
    if (before <= 0) {
      skipped.push({ spoken: spoken || item.name, reason: '이미 남은 재고가 없어요' });
      continue;
    }
    const base = { fridge_item_id: item.id, name: item.name, unit: item.unit, before, spoken };

    if (record.action === 'discard') {
      updates.push({ ...base, action: 'discard', after: 0, batches: [] });
      continue;
    }

    const remaining = Number(record.remaining);
    if (record.action !== 'set_remaining' || !Number.isFinite(remaining) || remaining < 0) continue;
    if (item.unit !== 'count') {
      skipped.push({
        spoken: spoken || item.name,
        reason: '무게·부피 재료는 남은 양을 말로 바꿀 수 없어요',
      });
      continue;
    }
    const target = Math.floor(remaining);
    if (target >= before) {
      skipped.push({
        spoken: spoken || item.name,
        reason: '지금 재고보다 많아요. 산 것이면 장보기로 말해 주세요',
      });
      continue;
    }
    if (target === 0) {
      updates.push({ ...base, action: 'discard', after: 0, batches: [] });
      continue;
    }

    let toRemove = before - target;
    const changed = batches.flatMap((batch) => {
      if (toRemove <= 0) return [];
      const removed = Math.min(batch.quantity, toRemove);
      toRemove -= removed;
      return [{ batch_id: batch.id, current_quantity: batch.quantity - removed }];
    });
    updates.push({ ...base, action: 'set_remaining', after: target, batches: changed });
  }

  return { updates, skipped };
}
