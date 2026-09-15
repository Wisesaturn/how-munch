import { type NextRequest } from 'next/server';

import { uniq } from 'es-toolkit';

import { withAuth } from '@/apps/route';

import { apiResponse } from '@/commons/lib/http/apiResponse';

const FIELDS = ['brand', 'store'] as const;
const KINDS = ['all', 'grocery', 'restaurant', 'delivery'] as const;

type Field = (typeof FIELDS)[number];
type Kind = (typeof KINDS)[number];

/**
 * GET /api/food-expenses/suggestions?householdId=&field=brand|store&kind=
 * 자동완성 후보 조회. kind로 스코프를 걸어 "이마트"가 외식 가게 후보로 뜨지 않게 한다.
 */
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  const { searchParams } = req.nextUrl;
  const householdId = searchParams.get('householdId');
  const field = searchParams.get('field');
  const kindParam = searchParams.get('kind') ?? 'all';

  if (!householdId) {
    return apiResponse.BAD_REQUEST('CMN_002', 'householdId가 필요합니다.');
  }
  if (!(FIELDS as readonly string[]).includes(field ?? '')) {
    return apiResponse.BAD_REQUEST('CMN_002', 'field는 brand 또는 store여야 합니다.');
  }
  if (!(KINDS as readonly string[]).includes(kindParam)) {
    return apiResponse.BAD_REQUEST('CMN_002', 'kind가 올바르지 않습니다.');
  }

  const column = field as Field;
  const kind = kindParam as Kind;

  let query = supabase
    .from('v_food_expenses')
    .select(column)
    .eq('household_id', householdId)
    .not(column, 'is', null);

  if (kind !== 'all') {
    query = query.eq('kind', kind);
  }

  const { data, error } = await query;

  if (error) return apiResponse.INTERNAL_ERROR();

  const values = uniq(
    ((data ?? []) as Record<string, string | null>[])
      .map((row) => row[column])
      .filter((value): value is string => !!value),
  );

  return apiResponse.OK(values);
});
