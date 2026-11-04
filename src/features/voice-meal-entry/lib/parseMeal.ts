import {
  collectPurchaseLinks,
  type PendingStockUpdate,
  type ParsedPurchase,
  type PurchaseLink,
  resolvePurchases,
  resolveStockUpdates,
  type StockUpdate,
  type VoiceCategory,
} from './parseExtras';

/** 식단 끼니. entities/meal의 MealType과 같은 값 */
export type VoiceMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type VoiceUnit = 'count' | 'g' | 'kg' | 'ml' | 'l';
export type VoiceExpenseKind = 'restaurant' | 'delivery';

/** 정리할 때 Claude와 서버가 보는 냉장고 품목 */
export interface VoiceFridgeItem {
  id: string;
  name: string;
  brand: string | null;
  unit: VoiceUnit;
  /** 장보기를 같은 품목으로 합치려면 분류까지 같아야 한다 */
  category_id: string;
  /** 남아 있는 구매분. 구매일 오름차순이 아니어도 된다 */
  batches: Array<{ id: string; purchased_date: string; quantity: number }>;
}

/** 말한 표현 하나로 냉장고 품목을 찾은 결과 */
export interface VoiceItemMatch {
  /** 하나로 좁혀진 품목. 고를 후보가 남아 있으면 null */
  best: VoiceFridgeItem | null;
  /** 이름 전체 일치(유사어 포함)로 좁혀졌는지 */
  isWhole: boolean;
  candidates: VoiceFridgeItem[];
}

export type VoiceItemMatcher = (term: string) => VoiceItemMatch;

/** Claude가 돌려주는 날것의 JSON 모양 */
interface RawParsedMeal {
  date?: unknown;
  meal_type?: unknown;
  dishes?: unknown;
  unmatched?: unknown;
  expense?: unknown;
  purchases?: unknown;
  purchase_store?: unknown;
  stock_updates?: unknown;
  summary?: unknown;
}

export interface ParsedIngredient {
  fridge_item_id: string;
  batch_id: string;
  unit: VoiceUnit;
  /** 개 단위: 쓴 수량. g/kg/ml/L: 0 */
  amount: number;
  usage_status: 'used' | 'depleted';
  /** 카드에 보일 품목 이름 */
  name: string;
  /** 사용자가 말한 표현 */
  spoken: string;
}

export interface ParsedDish {
  name: string;
  ingredients: ParsedIngredient[];
  /** 외식, 배달 메뉴. 재료를 찾거나 추천하지 않는다 */
  isOut: boolean;
}

/** 품목을 하나로 좁히지 못해 사용자가 골라야 하는 재료 */
export interface PendingIngredient {
  id: string;
  dish_name: string;
  spoken: string;
  amount: number | null;
  depleted: boolean;
  /** 고를 수 있는(재고가 있는) 후보 */
  candidate_ids: string[];
  /** ambiguous 후보 여러 건, none 못 찾음, no_stock 찾았지만 재고 없음 */
  reason: 'ambiguous' | 'none' | 'no_stock';
}

/** 메뉴만 말했을 때 메뉴 이름으로 찾은 품목. 없으면 Claude가 제안한 재료로 찾은 품목. 사용자가 누른 것만 차감한다 */
export interface DishSuggestion {
  dish_name: string;
  item_ids: string[];
}

/** 말한 수량보다 재고가 모자라 있는 만큼만 잡은 재료 */
export interface IngredientShortage {
  name: string;
  available: number;
  unit: VoiceUnit;
}

export interface StockPreview {
  fridge_item_id: string;
  batch_id: string;
  name: string;
  unit: VoiceUnit;
  before: number;
  after: number;
  mode: 'subtract' | 'deplete' | 'use';
}

export interface ParsedExpense {
  kind: VoiceExpenseKind;
  /** 가게 이름. 말하지 않았으면 빈 글 */
  brand: string;
  /** 메뉴 이름 */
  name: string;
  /** 배달 플랫폼. 식당이면 빈 글 */
  store: string;
  price: number;
  date: string;
  /** 편집 화면에서 적은 메모 */
  memo?: string;
}

export interface ParsedMealResult {
  date: string;
  type: VoiceMealType;
  /** home 집밥, out 외식, mixed 섞임 */
  mealKind: 'home' | 'out' | 'mixed';
  dishes: ParsedDish[];
  unmatched: Array<{ spoken: string; reason: string }>;
  pendingIngredients: PendingIngredient[];
  suggestions: DishSuggestion[];
  shortages: IngredientShortage[];
  stock: StockPreview[];
  expense: ParsedExpense | null;
  /** 장보기(산 것). 저장하면 장보기 내역과 냉장고 입고가 함께 생긴다 */
  purchases: ParsedPurchase[];
  /** 장보기 가게 이름. 말하지 않았으면 빈 글 */
  purchaseStore: string;
  /** 이번에 산 재료를 바로 메뉴에 쓴 것 */
  purchaseLinks: PurchaseLink[];
  /** 식단과 상관없이 재고만 바꾸는 것(버림, 남은 수량) */
  stockUpdates: StockUpdate[];
  /** 후보가 여러 건이라 골라야 하는 재고 정리 */
  pendingStockUpdates: PendingStockUpdate[];
  summary: string;
  /** 정리에 쓴 냉장고 품목. 결과 화면에서 재료를 고치면 재고 미리보기를 다시 계산한다 */
  fridgeItems: VoiceFridgeItem[];
  /** 장보기 분류 목록. 결과 화면에서 분류를 고를 때 쓴다 */
  categories: VoiceCategory[];
}

/** 재고 미리보기 계산에 필요한 메뉴 모양 */
export interface StockPreviewDish {
  ingredients: Array<
    Pick<ParsedIngredient, 'fridge_item_id' | 'batch_id' | 'amount' | 'usage_status'>
  >;
}

const MEAL_TYPES: VoiceMealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const NAME_MAX = 20;
const BRAND_MAX = 30;
const PRICE_MAX = 100_000_000;
const SUGGESTION_MAX = 6;
/** 이보다 짧은 말은 품목 이름이 같을 때만 추천한다. '국'이 '국간장'에 걸리는 것을 막는다 */
const MIN_SUGGESTION_TERM_LENGTH = 2;

/* -------------------------------------------------------------------------------------------------
 * Prompt
 * -----------------------------------------------------------------------------------------------*/

/**
 * @description 말한 글을 식단, 재료, 식비로 나누라는 시스템 프롬프트를 만든다.
 * 냉장고 목록은 넘기지 않는다. Claude는 말한 표현만 뽑고, 품목 찾기와 재고 계산은 서버가 한다.
 */
export function buildParseMealPrompt(
  today: string,
  now: string,
  categories: VoiceCategory[] = [],
): string {
  const categoryLine = categories
    .map((category) => `${category.code}(${category.label})`)
    .join(', ');

  return `너는 가계부 앱의 기록 도우미다. 사용자가 먹은 것, 산 것, 버린 것을 말한 한국어 문장을 읽고 아래 JSON 하나만 답한다. 설명, 코드 블록 표시는 쓰지 않는다.

오늘 날짜: ${today}, 지금 시각: ${now}

장보기 분류 코드: ${categoryLine || '(없음)'}

JSON 모양:
{
  "date": "YYYY-MM-DD",
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack" | null,
  "dishes": [
    {
      "name": "메뉴 이름",
      "is_out": true 또는 false,
      "ingredients": [
        { "spoken": "재료 이름", "purchase_index": "이번에 산 품목을 바로 썼으면 purchases 순서(0부터), 아니면 null", "amount": 숫자 또는 null, "depleted": true 또는 false }
      ],
      "suggested_ingredients": ["재료를 말하지 않았을 때 이 메뉴에 흔히 들어가는 재료 이름"]
    }
  ],
  "expense": { "price": 정수, "kind": "restaurant" | "delivery", "brand": "가게 이름 또는 null", "store": "배달 플랫폼 또는 null", "menu": "메뉴 이름 또는 null" } | null,
  "purchases": [{ "name": "산 품목 이름", "brand": "브랜드 또는 null", "category_code": "장보기 분류 코드", "unit": "count" | "g" | "kg" | "ml" | "l", "count": 숫자, "price": 정수 또는 null }],
  "purchase_store": "장 본 가게 이름 또는 null",
  "stock_updates": [{ "spoken": "재료 이름", "action": "discard" | "set_remaining", "remaining": 숫자 또는 null }],
  "summary": "정리한 내용을 해요체 한 문장으로"
}

규칙:
- 날짜: 오늘, 어제, 그저께, "11월 2일" 같은 표현을 오늘 날짜 기준으로 바꾼다. 말하지 않았으면 오늘.
- 끼니: 아침, 점심, 저녁, 간식. 야식은 snack. 말하지 않았으면 null.
- 메뉴: 먹은 음식 이름. 재료만 말하고 메뉴가 없으면 재료 이름을 메뉴로 쓴다.
- 재료: 사용자가 재료로 말한 것만 넣는다. spoken에는 조사와 수량을 뺀 재료 이름만 말한 그대로 쓴다("달걀 두 개를" → "달걀"). 다른 말로 바꾸거나 짐작하지 않는다.
- suggested_ingredients: 메뉴만 말하고 재료를 하나도 말하지 않았을 때만 흔한 재료 이름을 6개 안으로 쓴다. 재료를 말했거나 is_out이 true면 빈 배열로 둔다.
- amount: 개 단위 품목은 말한 개수(두 개 → 2), 말하지 않았으면 null. g, ml 같은 무게·부피 품목은 null.
- depleted: "다 썼어", "다 먹었어", "남김없이"처럼 그 재료를 모두 쓴 표현이면 true.
- is_out: 사 먹은 외식, 배달 음식이면 true. 이때 ingredients와 suggested_ingredients는 빈 배열로 둔다.
- expense: 금액을 말했을 때만 만든다. 만 오천 원 → 15000. "시켰어", "배달", "배민", "쿠팡이츠", "요기요"가 있으면 delivery, 아니면 restaurant. store는 배달 플랫폼 이름(배민이면 "배달의민족"). 가게 이름을 말하지 않았으면 brand는 null.
- 금액을 말하지 않았으면 expense는 null.
- purchases: "샀어", "장 봤어", "마트에서" 처럼 산 것만 넣는다. 장보기 금액은 expense에 넣지 않는다(expense는 외식, 배달만).
- purchases의 unit과 count: 통째로 세는 물건은 "count"와 개수(두 개 → 2, 한 판 → 1). 고기처럼 무게로 산 것은 "g"나 "kg"와 그 양(삼겹살 500그램 → g, 500). 애매하면 "count".
- purchases의 price: 품목별 금액. 여러 개를 사고 합계만 말했으면 첫 품목에 합계를 넣고 나머지는 0. 말하지 않았으면 null.
- 산 재료로 바로 요리해 먹었으면 그 메뉴 재료에 purchase_index를 쓴다.
- stock_updates: 먹은 메뉴와 상관없이 재고만 바뀐 말. "버렸어", "상해서 버렸어", "(메뉴 없이) 다 먹었어" → discard. "계란 3개 남았어"처럼 남은 양을 말하면 set_remaining과 remaining. spoken에는 조사와 수량을 뺀 재료 이름만 말한 그대로 쓴다.
- summary: 사용자가 한 일을 "~했어요"로 끝나는 해요체 한 문장, 40자 안으로 쓴다. 날짜는 오늘, 어제처럼 쓰고 배달 플랫폼은 expense.store에 쓴 이름을 그대로 쓴다. 짐작이나 감정은 넣지 않는다.`;
}

/* -------------------------------------------------------------------------------------------------
 * Parse
 * -----------------------------------------------------------------------------------------------*/

/** @description Claude 응답 글에서 JSON 객체를 꺼낸다. 앞뒤 설명이나 코드 블록 표시가 섞여도 첫 `{`부터 마지막 `}`까지 읽는다 */
export function extractJsonObject(text: string): RawParsedMeal {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('응답에서 JSON을 찾지 못했습니다.');
  const parsed: unknown = JSON.parse(text.slice(start, end + 1));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('응답 JSON이 객체가 아닙니다.');
  }
  return parsed as RawParsedMeal;
}

/* -------------------------------------------------------------------------------------------------
 * Resolve
 * -----------------------------------------------------------------------------------------------*/

/** @description 지금 시각(HH:mm)으로 끼니를 짐작한다. 05~10시 아침, 11~15시 점심, 16~21시 저녁, 그 밖은 간식 */
export function guessMealType(now: string): VoiceMealType {
  const hour = Number(now.slice(0, 2));
  if (!Number.isFinite(hour)) return 'snack';
  if (hour >= 5 && hour <= 10) return 'breakfast';
  if (hour >= 11 && hour <= 15) return 'lunch';
  if (hour >= 16 && hour <= 21) return 'dinner';
  return 'snack';
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isCountUnit(unit: VoiceUnit) {
  return unit === 'count';
}

/** 남은 구매분을 구매일이 오래된 순서로 */
function activeBatches(item: VoiceFridgeItem) {
  return item.batches
    .filter((batch) => batch.quantity > 0)
    .sort((a, b) => a.purchased_date.localeCompare(b.purchased_date));
}

/** @description 품목에 남은 재고가 있는지 본다 */
export function hasStock(item: VoiceFridgeItem) {
  return item.batches.some((batch) => batch.quantity > 0);
}

/**
 * @description 재료 한 줄을 구매분별 줄로 나눈다. 개 단위는 오래된 구매분부터 채우고, 모자라면 있는 만큼만 잡아
 * `available`에 전체 남은 수량을 알린다. 무게·부피는 가장 오래된 구매분에 썼다고 남기고, 다 썼으면 전부 소진한다.
 * `usedByBatch`는 이 끼니에서 이미 잡은 수량으로, 호출할 때마다 갱신한다.
 */
export function allocateIngredient(
  item: VoiceFridgeItem,
  { spoken, amount, depleted }: { spoken: string; amount: number | null; depleted: boolean },
  usedByBatch: Map<string, number>,
): { rows: ParsedIngredient[]; available: number | null } {
  const batches = activeBatches(item);
  const toRow = (
    batchId: string,
    rowAmount: number,
    usageStatus: ParsedIngredient['usage_status'],
  ): ParsedIngredient => ({
    fridge_item_id: item.id,
    batch_id: batchId,
    unit: item.unit,
    amount: rowAmount,
    usage_status: usageStatus,
    name: item.name,
    spoken,
  });

  if (!isCountUnit(item.unit)) {
    if (batches.length === 0) return { rows: [], available: null };
    return {
      rows: depleted
        ? batches.map((batch) => toRow(batch.id, 0, 'depleted'))
        : [toRow(batches[0].id, 0, 'used')],
      available: null,
    };
  }

  const spokenAmount = Math.floor(Number(amount));
  const wanted = Number.isFinite(spokenAmount) && spokenAmount > 0 ? spokenAmount : 1;
  const left = batches.map((batch) => ({
    id: batch.id,
    quantity: batch.quantity - (usedByBatch.get(batch.id) ?? 0),
  }));
  const total = left.reduce((sum, batch) => sum + Math.max(0, batch.quantity), 0);
  let toTake = depleted ? total : Math.min(wanted, total);

  const rows = left.flatMap((batch) => {
    const taken = Math.min(toTake, Math.max(0, batch.quantity));
    if (taken <= 0) return [];
    toTake -= taken;
    usedByBatch.set(batch.id, (usedByBatch.get(batch.id) ?? 0) + taken);
    return [toRow(batch.id, taken, 'used')];
  });
  return { rows, available: !depleted && wanted > total ? total : null };
}

/**
 * @description 메뉴 편집 전후를 비교해 옛 메뉴 이름이 어떤 이름이 됐는지 돌려준다. 지워진 메뉴는 null이다.
 * 메뉴 수가 같으면 같은 자리의 메뉴를 이름만 바뀐 것으로 본다.
 */
export function mapDishNames(
  previous: Array<{ name: string }>,
  next: Array<{ name: string }>,
): Map<string, string | null> {
  const nextNames = new Set(next.map((dish) => dish.name));
  return new Map(
    previous.map((dish, index) => {
      if (nextNames.has(dish.name)) return [dish.name, dish.name];
      return [dish.name, previous.length === next.length ? next[index].name : null];
    }),
  );
}

/** @description 같은 구매분을 가리키는 줄을 메뉴 안에서 하나로 합친다 */
export function mergeIngredientRows<
  T extends { batch_id: string; amount: number; usage_status: 'used' | 'depleted' },
>(existing: T[], rows: T[]): T[] {
  const merged = existing.map((row) => ({ ...row }));
  for (const row of rows) {
    const same = merged.find((candidate) => candidate.batch_id === row.batch_id);
    if (!same) {
      merged.push({ ...row });
      continue;
    }
    same.amount += row.amount;
    if (row.usage_status === 'depleted') same.usage_status = 'depleted';
  }
  return merged;
}

/**
 * @description Claude 응답을 검사해 카드에 보일 결과로 바꾼다.
 * 말한 재료는 `matchItem`으로 찾는다. 하나로 좁혀지면 구매분별 줄로 나누고, 그렇지 않으면 사용자가 고를 항목으로 남긴다.
 * 메뉴만 말했으면 메뉴 이름으로 냉장고를 찾아 재고가 있는 품목을 추천으로 돌려준다. 찾지 못했을 때만 Claude가 제안한 재료로 찾는다. 추천은 차감하지 않는다.
 */
export function resolveParsedMeal(
  raw: RawParsedMeal,
  items: VoiceFridgeItem[],
  {
    today,
    now,
    categories = [],
    matchItem,
  }: { today: string; now: string; categories?: VoiceCategory[]; matchItem: VoiceItemMatcher },
): ParsedMealResult {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const date = isDate(raw.date) ? raw.date : today;
  const type = MEAL_TYPES.includes(raw.meal_type as VoiceMealType)
    ? (raw.meal_type as VoiceMealType)
    : guessMealType(now);

  const pendingIngredients: PendingIngredient[] = [];
  const suggestions: DishSuggestion[] = [];
  const shortages: IngredientShortage[] = [];
  /** 끼니 전체에서 구매분마다 이미 쓴 수량. 남은 재고를 넘지 않게 한다 */
  const usedByBatch = new Map<string, number>();
  const rawDishes = Array.isArray(raw.dishes) ? raw.dishes : [];

  const dishes: ParsedDish[] = rawDishes.flatMap((rawDish: unknown): ParsedDish[] => {
    if (typeof rawDish !== 'object' || rawDish === null) return [];
    const dishRecord = rawDish as {
      name?: unknown;
      is_out?: unknown;
      ingredients?: unknown;
      suggested_ingredients?: unknown;
    };
    const name = asText(dishRecord.name).slice(0, NAME_MAX);
    if (!name) return [];
    if (dishRecord.is_out === true) return [{ name, ingredients: [], isOut: true }];

    let ingredients: ParsedIngredient[] = [];
    const rawIngredients = Array.isArray(dishRecord.ingredients) ? dishRecord.ingredients : [];
    for (const rawIngredient of rawIngredients) {
      if (typeof rawIngredient !== 'object' || rawIngredient === null) continue;
      const record = rawIngredient as Record<string, unknown>;
      // 이번에 산 재료는 장보기를 저장한 뒤 잇는다(purchaseLinks)
      if (record.purchase_index !== null && record.purchase_index !== undefined) continue;
      const spoken = asText(record.spoken);
      if (!spoken) continue;

      const amount = typeof record.amount === 'number' ? record.amount : null;
      const depleted = record.depleted === true;
      const match = matchItem(spoken);
      const stockedCandidates = match.candidates.filter(hasStock);
      const pending = {
        id: `${name}:${spoken}:${pendingIngredients.length}`,
        dish_name: name,
        spoken,
        amount,
        depleted,
      };

      if (match.candidates.length === 0) {
        pendingIngredients.push({ ...pending, candidate_ids: [], reason: 'none' });
        continue;
      }
      if (!match.best) {
        pendingIngredients.push({
          ...pending,
          candidate_ids: stockedCandidates.map((item) => item.id),
          reason: stockedCandidates.length > 0 ? 'ambiguous' : 'no_stock',
        });
        continue;
      }
      if (!hasStock(match.best)) {
        pendingIngredients.push({ ...pending, candidate_ids: [], reason: 'no_stock' });
        continue;
      }

      const { rows, available } = allocateIngredient(
        match.best,
        { spoken, amount, depleted },
        usedByBatch,
      );
      if (available !== null) {
        shortages.push({ name: match.best.name, available, unit: match.best.unit });
      }
      ingredients = mergeIngredientRows(ingredients, rows);
    }

    const hasPending = pendingIngredients.some((pending) => pending.dish_name === name);
    const hasPurchaseLink = rawIngredients.some((rawIngredient) => {
      const purchaseIndex = (rawIngredient as { purchase_index?: unknown } | null)?.purchase_index;
      return purchaseIndex !== null && purchaseIndex !== undefined;
    });
    if (ingredients.length === 0 && !hasPending && !hasPurchaseLink) {
      const itemIds = suggestItems(name, dishRecord.suggested_ingredients, matchItem);
      if (itemIds.length > 0) suggestions.push({ dish_name: name, item_ids: itemIds });
    }

    return [{ name, ingredients, isOut: false }];
  });

  const unmatched: ParsedMealResult['unmatched'] = [];
  const expense = resolveExpense(raw.expense, dishes, date);
  const purchases = resolvePurchases(raw.purchases, matchItem, categories);
  const purchaseLinks = collectPurchaseLinks(raw.dishes, purchases);
  const {
    updates: stockUpdates,
    pending: pendingStockUpdates,
    skipped,
  } = resolveStockUpdates(raw.stock_updates, matchItem);
  skipped.forEach((entry) => unmatched.push(entry));
  const hasIngredients = dishes.some((dish) => dish.ingredients.length > 0);
  const mealKind = getMealKind(hasIngredients, expense !== null);

  return {
    date,
    type,
    mealKind,
    dishes,
    unmatched,
    pendingIngredients,
    suggestions,
    shortages,
    stock: buildStockPreview(dishes, itemById),
    expense,
    purchases,
    purchaseStore: asText(raw.purchase_store).slice(0, 30),
    purchaseLinks,
    stockUpdates,
    pendingStockUpdates,
    summary: asText(raw.summary),
    fridgeItems: items,
    categories,
  };
}

/** 말 하나를 냉장고에서 검색해 재고가 있는 품목을 돌려준다. 좁혀진 품목을 앞에 두고 나머지 후보를 잇는다 */
function searchStockedItemIds(term: string, matchItem: VoiceItemMatcher): string[] {
  const { best, isWhole, candidates } = matchItem(term);
  if (term.length < MIN_SUGGESTION_TERM_LENGTH && !isWhole) return [];
  return (best ? [best, ...candidates] : candidates).filter(hasStock).map((item) => item.id);
}

/** 메뉴 이름의 검색 결과를 먼저 쓰고, 재고가 있는 품목이 없을 때만 Claude가 제안한 재료를 검색한다 */
function suggestItems(
  dishName: string,
  rawSuggestions: unknown,
  matchItem: VoiceItemMatcher,
): string[] {
  const found = searchStockedItemIds(dishName, matchItem);
  const suggested = Array.isArray(rawSuggestions) ? rawSuggestions.map(asText) : [];
  const itemIds =
    found.length > 0
      ? found
      : suggested.flatMap((term) => (term ? searchStockedItemIds(term, matchItem) : []));
  return [...new Set(itemIds)].slice(0, SUGGESTION_MAX);
}

function getMealKind(hasIngredients: boolean, hasExpense: boolean): ParsedMealResult['mealKind'] {
  if (hasIngredients && hasExpense) return 'mixed';
  if (hasExpense) return 'out';
  return 'home';
}

function resolveExpense(
  rawExpense: unknown,
  dishes: ParsedDish[],
  date: string,
): ParsedExpense | null {
  if (typeof rawExpense !== 'object' || rawExpense === null) return null;
  const record = rawExpense as Record<string, unknown>;
  const price = Math.round(Number(record.price));
  if (!Number.isFinite(price) || price <= 0 || price > PRICE_MAX) return null;

  const kind: VoiceExpenseKind = record.kind === 'delivery' ? 'delivery' : 'restaurant';
  return {
    kind,
    brand: asText(record.brand).slice(0, BRAND_MAX),
    name: (asText(record.menu) || dishes[0]?.name || '').slice(0, NAME_MAX),
    store: kind === 'delivery' ? asText(record.store).slice(0, NAME_MAX) : '',
    price,
    date,
  };
}

/** @description 식단을 저장하면 구매분마다 수량이 어떻게 바뀌는지 미리 계산한다. 저장 RPC와 같은 규칙이다 */
export function buildStockPreview(
  dishes: StockPreviewDish[],
  itemById: Map<string, VoiceFridgeItem>,
): StockPreview[] {
  const byBatch = new Map<string, StockPreview>();
  for (const ingredient of dishes.flatMap((dish) => dish.ingredients)) {
    const item = itemById.get(ingredient.fridge_item_id);
    const batch = item?.batches.find((candidate) => candidate.id === ingredient.batch_id);
    if (!item || !batch) continue;

    const current = byBatch.get(batch.id) ?? {
      fridge_item_id: item.id,
      batch_id: batch.id,
      name: item.name,
      unit: item.unit,
      before: batch.quantity,
      after: batch.quantity,
      mode: 'use' as const,
    };
    if (isCountUnit(item.unit)) {
      current.after = Math.max(0, current.after - ingredient.amount);
      current.mode = 'subtract';
    } else if (ingredient.usage_status === 'depleted') {
      current.after = 0;
      current.mode = 'deplete';
    }
    byBatch.set(batch.id, current);
  }
  return [...byBatch.values()];
}
