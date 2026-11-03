import {
  collectPurchaseLinks,
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
  /** 남아 있는 구매분. 구매일 오름차순이 아니어도 된다 */
  batches: Array<{ id: string; purchased_date: string; quantity: number }>;
}

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
}

export interface ParsedMealResult {
  date: string;
  type: VoiceMealType;
  /** home 집밥, out 외식, mixed 섞임 */
  mealKind: 'home' | 'out' | 'mixed';
  dishes: ParsedDish[];
  unmatched: Array<{ spoken: string; reason: string }>;
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
const NOT_IN_FRIDGE = '냉장고에서 찾지 못했어요';
const NO_STOCK = '남은 구매분이 없어요';

/* -------------------------------------------------------------------------------------------------
 * Prompt
 * -----------------------------------------------------------------------------------------------*/

/**
 * @description 말한 글을 식단, 재료, 식비로 나누라는 시스템 프롬프트를 만든다.
 * 냉장고 품목은 id, 이름, 브랜드, 단위만 넘기고 구매분 선택과 재고 계산은 서버가 한다.
 */
export function buildParseMealPrompt(
  items: VoiceFridgeItem[],
  today: string,
  now: string,
  categories: VoiceCategory[] = [],
): string {
  const itemLines = items
    .map(
      (item) => `- ${item.id} | ${item.name}${item.brand ? ` (${item.brand})` : ''} | ${item.unit}`,
    )
    .join('\n');

  const categoryLine = categories
    .map((category) => `${category.code}(${category.label})`)
    .join(', ');

  return `너는 가계부 앱의 기록 도우미다. 사용자가 먹은 것, 산 것, 버린 것을 말한 한국어 문장을 읽고 아래 JSON 하나만 답한다. 설명, 코드 블록 표시는 쓰지 않는다.

오늘 날짜: ${today}, 지금 시각: ${now}

냉장고 품목 (id | 이름 (브랜드) | 단위):
${itemLines || '(없음)'}

장보기 분류 코드: ${categoryLine || '(없음)'}

JSON 모양:
{
  "date": "YYYY-MM-DD",
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack" | null,
  "dishes": [
    {
      "name": "메뉴 이름",
      "ingredients": [
        { "fridge_item_id": "위 목록의 id 또는 null", "purchase_index": "이번에 산 품목을 바로 썼으면 purchases 순서(0부터), 아니면 null", "spoken": "사용자가 말한 재료 표현", "amount": 숫자 또는 null, "depleted": true 또는 false }
      ]
    }
  ],
  "unmatched": [{ "spoken": "목록에서 찾지 못한 재료 표현" }],
  "expense": { "price": 정수, "kind": "restaurant" | "delivery", "brand": "가게 이름 또는 null", "store": "배달 플랫폼 또는 null", "menu": "메뉴 이름 또는 null" } | null,
  "purchases": [{ "name": "산 품목 이름", "brand": "브랜드 또는 null", "fridge_item_id": "냉장고 목록에 같은 품목이 있으면 그 id, 없으면 null", "category_code": "장보기 분류 코드", "unit": "count" | "g" | "kg" | "ml" | "l", "count": 숫자, "price": 정수 또는 null }],
  "purchase_store": "장 본 가게 이름 또는 null",
  "stock_updates": [{ "fridge_item_id": "위 목록의 id", "action": "discard" | "set_remaining", "remaining": 숫자 또는 null, "spoken": "사용자가 말한 표현" }],
  "summary": "정리한 내용을 해요체 한 문장으로"
}

규칙:
- 날짜: 오늘, 어제, 그저께, "11월 2일" 같은 표현을 오늘 날짜 기준으로 바꾼다. 말하지 않았으면 오늘.
- 끼니: 아침, 점심, 저녁, 간식. 야식은 snack. 말하지 않았으면 null.
- 메뉴: 먹은 음식 이름. 재료만 말하고 메뉴가 없으면 재료 이름을 메뉴로 쓴다.
- 재료: 냉장고에서 꺼내 쓴 것만 넣는다. 위 목록의 품목과 같은 것이면 그 id를 쓴다(계란과 달걀, 돼지고기와 삼겹살처럼 같은 뜻도 연결한다). 확신이 없으면 fridge_item_id를 null로 두고 unmatched에도 넣는다.
- amount: 개 단위 품목은 말한 개수(두 개 → 2), 말하지 않았으면 null. g, ml 같은 무게·부피 품목은 null.
- depleted: "다 썼어", "다 먹었어", "남김없이"처럼 그 재료를 모두 쓴 표현이면 true.
- 외식, 배달 음식처럼 냉장고 재료가 없는 메뉴는 ingredients를 빈 배열로 둔다.
- expense: 금액을 말했을 때만 만든다. 만 오천 원 → 15000. "시켰어", "배달", "배민", "쿠팡이츠", "요기요"가 있으면 delivery, 아니면 restaurant. store는 배달 플랫폼 이름(배민이면 "배달의민족"). 가게 이름을 말하지 않았으면 brand는 null.
- 금액을 말하지 않았으면 expense는 null.
- purchases: "샀어", "장 봤어", "마트에서" 처럼 산 것만 넣는다. 장보기 금액은 expense에 넣지 않는다(expense는 외식, 배달만).
- purchases의 unit과 count: 통째로 세는 물건은 "count"와 개수(두 개 → 2, 한 판 → 1). 고기처럼 무게로 산 것은 "g"나 "kg"와 그 양(삼겹살 500그램 → g, 500). 애매하면 "count".
- purchases의 price: 품목별 금액. 여러 개를 사고 합계만 말했으면 첫 품목에 합계를 넣고 나머지는 0. 말하지 않았으면 null.
- 산 재료로 바로 요리해 먹었으면 그 메뉴 재료에 purchase_index를 쓰고 fridge_item_id는 null로 둔다.
- stock_updates: 먹은 메뉴와 상관없이 재고만 바뀐 말. "버렸어", "상해서 버렸어", "(메뉴 없이) 다 먹었어" → discard. "계란 3개 남았어"처럼 남은 양을 말하면 set_remaining과 remaining. 목록에 있는 품목만 넣는다.
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

/** 남은 구매분 중 구매일이 가장 오래된 것. 남은 것이 없으면 null */
function pickBatch(item: VoiceFridgeItem) {
  return (
    item.batches
      .filter((batch) => batch.quantity > 0)
      .sort((a, b) => a.purchased_date.localeCompare(b.purchased_date))[0] ?? null
  );
}

/**
 * @description Claude 응답을 검사해 카드에 보일 결과로 바꾼다.
 * 목록에 없는 품목은 `unmatched`로 옮기고, 구매분은 구매일이 가장 오래된 것을 고른다.
 * 개 단위 수량은 말한 숫자(없으면 1)를 남은 재고 안으로 줄이고, 같은 구매분을 여러 번 말하면 한 번으로 합친다.
 */
export function resolveParsedMeal(
  raw: RawParsedMeal,
  items: VoiceFridgeItem[],
  { today, now, categories = [] }: { today: string; now: string; categories?: VoiceCategory[] },
): ParsedMealResult {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const date = isDate(raw.date) ? raw.date : today;
  const type = MEAL_TYPES.includes(raw.meal_type as VoiceMealType)
    ? (raw.meal_type as VoiceMealType)
    : guessMealType(now);

  const unmatched: ParsedMealResult['unmatched'] = [];
  const unmatchedSpoken = new Set<string>();
  function addUnmatched(spoken: string, reason: string) {
    if (!spoken || unmatchedSpoken.has(spoken)) return;
    unmatchedSpoken.add(spoken);
    unmatched.push({ spoken, reason });
  }

  /** 끼니 전체에서 구매분마다 이미 쓴 수량. 남은 재고를 넘지 않게 한다 */
  const usedByBatch = new Map<string, number>();
  const rawDishes = Array.isArray(raw.dishes) ? raw.dishes : [];

  const dishes: ParsedDish[] = rawDishes.flatMap((rawDish: unknown) => {
    if (typeof rawDish !== 'object' || rawDish === null) return [];
    const dishRecord = rawDish as { name?: unknown; ingredients?: unknown };
    const name = asText(dishRecord.name).slice(0, NAME_MAX);
    if (!name) return [];

    const ingredients: ParsedIngredient[] = [];
    const rawIngredients = Array.isArray(dishRecord.ingredients) ? dishRecord.ingredients : [];
    for (const rawIngredient of rawIngredients) {
      if (typeof rawIngredient !== 'object' || rawIngredient === null) continue;
      const record = rawIngredient as Record<string, unknown>;
      const spoken = asText(record.spoken);
      // 이번에 산 재료는 장보기를 저장한 뒤 잇는다(purchaseLinks)
      if (record.purchase_index !== null && record.purchase_index !== undefined) continue;
      const item = itemById.get(asText(record.fridge_item_id));
      if (!item) {
        addUnmatched(spoken, NOT_IN_FRIDGE);
        continue;
      }
      const batch = pickBatch(item);
      if (!batch) {
        addUnmatched(spoken || item.name, NO_STOCK);
        continue;
      }

      const existing = ingredients.find((ingredient) => ingredient.batch_id === batch.id);
      const isDepleted = record.depleted === true;

      if (isCountUnit(item.unit)) {
        const spokenAmount = Math.floor(Number(record.amount));
        const wanted = Number.isFinite(spokenAmount) && spokenAmount > 0 ? spokenAmount : 1;
        const remaining = batch.quantity - (usedByBatch.get(batch.id) ?? 0);
        const amount = Math.min(isDepleted ? remaining : wanted, remaining);
        if (amount <= 0) continue;
        usedByBatch.set(batch.id, (usedByBatch.get(batch.id) ?? 0) + amount);
        if (existing) {
          existing.amount += amount;
          continue;
        }
        ingredients.push({
          fridge_item_id: item.id,
          batch_id: batch.id,
          unit: item.unit,
          amount,
          usage_status: 'used',
          name: item.name,
          spoken,
        });
        continue;
      }

      if (existing) {
        if (isDepleted) existing.usage_status = 'depleted';
        continue;
      }
      ingredients.push({
        fridge_item_id: item.id,
        batch_id: batch.id,
        unit: item.unit,
        amount: 0,
        usage_status: isDepleted ? 'depleted' : 'used',
        name: item.name,
        spoken,
      });
    }

    return [{ name, ingredients }];
  });

  const rawUnmatched = Array.isArray(raw.unmatched) ? raw.unmatched : [];
  for (const entry of rawUnmatched) {
    const spoken =
      typeof entry === 'string' ? entry.trim() : asText((entry as { spoken?: unknown })?.spoken);
    addUnmatched(spoken, NOT_IN_FRIDGE);
  }

  const expense = resolveExpense(raw.expense, dishes, date);
  const purchases = resolvePurchases(raw.purchases, items, categories);
  const purchaseLinks = collectPurchaseLinks(raw.dishes, purchases);
  const { updates: stockUpdates, skipped } = resolveStockUpdates(raw.stock_updates, items);
  skipped.forEach((entry) => addUnmatched(entry.spoken, entry.reason));
  const hasIngredients = dishes.some((dish) => dish.ingredients.length > 0);
  const mealKind = getMealKind(hasIngredients, expense !== null);

  return {
    date,
    type,
    mealKind,
    dishes,
    unmatched,
    stock: buildStockPreview(dishes, itemById),
    expense,
    purchases,
    purchaseStore: asText(raw.purchase_store).slice(0, 30),
    purchaseLinks,
    stockUpdates,
    summary: asText(raw.summary),
    fridgeItems: items,
    categories,
  };
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
