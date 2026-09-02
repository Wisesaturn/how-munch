import { type NextRequest } from 'next/server';

import { josa } from 'es-hangul';

import { withAuth, type AuthContext } from '@/apps/route';

import { resolveDomainError } from '@/commons/lib';
import { apiResponse } from '@/commons/lib/http/apiResponse';
import { dispatchHouseholdNotification } from '@/commons/lib/http/dispatchHouseholdNotification';

import { type MealType } from '@/entities/meal';

type IngredientUsageStatus = 'used' | 'depleted';
type IngredientUnit = 'count' | 'g' | 'kg' | 'ml' | 'l';

interface UpsertMealIngredient {
  fridge_item_id: string;
  /** 선택한 배치(구매분) ID — 소진/차감 대상 배치 */
  batch_id?: string | null;
  /** 냉장고 품목 단위 — g/kg/ml/L vs 개 판별 기준 */
  unit?: IngredientUnit;
  /** 개 단위: 수량. g/kg/ml/L 단위: 없음 */
  amount?: number | null;
  /** g/kg/ml/L 단위: 'used' | 'depleted'. 개 단위: 없음 */
  usage_status?: IngredientUsageStatus;
}

interface UpsertMealBody {
  householdId: string;
  date: string;
  type: MealType;
  dishes: Array<{
    name: string;
    ingredients: Array<UpsertMealIngredient>;
  }>;
  skipNotification?: boolean;
}

function toSafePositiveAmount(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  if (amount <= 0) return 0;
  return amount;
}

function isUsageStatusUnit(unit?: IngredientUnit) {
  return unit === 'g' || unit === 'kg' || unit === 'ml' || unit === 'l';
}

function normalizeIngredient(ingredient: UpsertMealIngredient) {
  if (!ingredient.fridge_item_id) return null;

  const batchId = ingredient.batch_id || null;

  if (isUsageStatusUnit(ingredient.unit)) {
    // g/kg/ml/L 품목: usage_status 기반
    if (ingredient.usage_status === 'used' || ingredient.usage_status === 'depleted') {
      return {
        fridge_item_id: ingredient.fridge_item_id,
        batch_id: batchId,
        usage_status: ingredient.usage_status,
      };
    }
    return null;
  }

  // 개 품목: amount 기반
  const amount = toSafePositiveAmount(ingredient.amount);
  if (amount <= 0) return null;
  return { fridge_item_id: ingredient.fridge_item_id, batch_id: batchId, amount };
}

/** GET /api/meals?householdId=&date= — 특정 날짜 식단 조회 */
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  const { searchParams } = req.nextUrl;
  const householdId = searchParams.get('householdId');
  const date = searchParams.get('date');

  if (!householdId || !date) {
    return apiResponse.BAD_REQUEST('CMN_002', 'householdId와 date가 필요합니다.');
  }

  const { data: meals, error: mealsError } = await supabase
    .from('meals')
    .select(
      '*, dishes(*, ingredients:dish_ingredients(*, fridge_items(unit, name, category_id), fridge_item_batches(id, purchased_date, quantity, expiry_date)))',
    )
    .eq('household_id', householdId)
    .eq('date', date)
    .order('type', { ascending: true });

  if (mealsError) return apiResponse.INTERNAL_ERROR();

  return apiResponse.OK(await withResolvedOrphanIngredients(supabase, meals ?? []));
});

/** 식단 조회 결과에서 조인이 비어 있는 재료 행 */
interface MealQueryIngredient {
  fridge_item_id: string;
  fridge_items: { unit: string; name: string; category_id: string } | null;
  is_orphaned?: boolean;
}

interface MealQueryDish {
  ingredients: MealQueryIngredient[] | null;
}

interface MealQueryRow {
  dishes: MealQueryDish[] | null;
}

/**
 * 소프트 삭제된 냉장고 품목을 참조하는 식단 재료의 이름을 보충한다.
 *
 * fridge_select RLS가 deleted_at is null로 막고 있어 해당 행은 조인 결과가 null이 되고,
 * 화면에는 재료 이름이 빈 값으로 나타난다. 조인이 비어 있는 행이 있을 때만
 * resolve_orphan_ingredient_names RPC를 호출해 이름을 채우고 is_orphaned로 표시한다.
 */
async function withResolvedOrphanIngredients<T extends MealQueryRow>(
  supabase: AuthContext['supabase'],
  meals: T[],
): Promise<T[]> {
  const orphanIds = buildOrphanIds(meals);
  if (orphanIds.length === 0) return meals;

  const { data, error } = await supabase.rpc('resolve_orphan_ingredient_names', {
    p_fridge_item_ids: orphanIds,
  });
  if (error || !data) return meals;

  const resolved = new Map(data.map((row) => [row.id, row]));

  for (const meal of meals) {
    for (const dish of meal.dishes ?? []) {
      for (const ingredient of dish.ingredients ?? []) {
        if (ingredient.fridge_items) continue;
        const match = resolved.get(ingredient.fridge_item_id);
        if (!match) continue;
        ingredient.fridge_items = {
          unit: match.unit,
          name: match.name,
          category_id: match.category_id,
        };
        ingredient.is_orphaned = true;
      }
    }
  }

  return meals;
}

/** 조인이 비어 있는 재료 행의 fridge_item_id를 중복 없이 모은다 */
function buildOrphanIds(meals: MealQueryRow[]): string[] {
  const ids = new Set<string>();
  for (const meal of meals) {
    for (const dish of meal.dishes ?? []) {
      for (const ingredient of dish.ingredients ?? []) {
        if (!ingredient.fridge_items) ids.add(ingredient.fridge_item_id);
      }
    }
  }
  return [...ids];
}

const MEAL_TYPE_LABEL: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

/** POST /api/meals — 식단 저장 (해당 meal type 전체 교체) */
export const POST = withAuth(async (req: NextRequest, { userId, supabase }) => {
  const body: UpsertMealBody = await req.json();
  const { householdId, date, type, dishes, skipNotification } = body;

  if (!householdId || !date || !type) {
    return apiResponse.BAD_REQUEST('CMN_002', '필수 항목이 누락되었습니다.');
  }

  const normalizedDishes = dishes.map((dish, index) => ({
    name: dish.name.trim() || '[이름 없음]',
    sort_order: index,
    ingredients: dish.ingredients.map(normalizeIngredient).filter(Boolean),
  }));

  const { data, error } = await supabase.rpc('upsert_meal_with_usage', {
    p_household_id: householdId,
    p_date: date,
    p_type: type,
    p_dishes: normalizedDishes,
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  void (async () => {
    if (skipNotification) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('user_id', userId)
      .single();
    const nickname = profile?.nickname ?? '가구원';
    const mealLabel = MEAL_TYPE_LABEL[type] ?? type;

    dispatchHouseholdNotification({
      accessToken: session.access_token,
      householdId,
      triggeredBy: userId,
      type: 'meal_added',
      title: '식단 등록',
      body: `${nickname}님이 ${josa(mealLabel, '을/를')} 등록했어요`,
    });
  })();

  return apiResponse.CREATED(data);
});

/** DELETE /api/meals?id= — 식단 삭제 (재고 복구) */
export const DELETE = withAuth(async (req: NextRequest, { supabase }) => {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get('id');

  if (!id) {
    return apiResponse.BAD_REQUEST('CMN_002', 'id가 필요합니다.');
  }

  const { error } = await supabase.rpc('delete_meal_with_usage_restore', {
    p_meal_id: id,
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.NO_CONTENT();
});
