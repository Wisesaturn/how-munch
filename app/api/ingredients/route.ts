import { type NextRequest } from 'next/server';

import { format, endOfMonth, startOfMonth } from 'date-fns';

import { withAuth } from '@/apps/route';

import { resolveDomainError } from '@/commons/lib';
import { apiResponse } from '@/commons/lib/http/apiResponse';
import { type Json } from '@/commons/model/types';

/** GET /api/ingredients?householdId=&year=&month= — 월별 장보기 내역 조회 */
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  const { searchParams } = req.nextUrl;
  const householdId = searchParams.get('householdId');
  const year = Number(searchParams.get('year'));
  const month = Number(searchParams.get('month'));

  if (!householdId || !year || !month) {
    return apiResponse.BAD_REQUEST('CMN_002', 'householdId, year, month가 필요합니다.');
  }

  const target = new Date(year, month - 1);
  const start = format(startOfMonth(target), 'yyyy-MM-dd');
  const end = format(endOfMonth(target), 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false });

  if (error) return apiResponse.INTERNAL_ERROR();
  return apiResponse.OK(data ?? []);
});

/** POST /api/ingredients — 장보기 항목 추가 */
export const POST = withAuth(async (req: NextRequest, { supabase }) => {
  const body = await req.json();

  const { data, error } = await supabase.rpc('add_ingredient_with_fridge', {
    p_household_id: body.household_id,
    p_name: body.name,
    p_price: body.price ?? 0,
    p_store: body.store ?? null,
    p_brand: body.brand ?? null,
    p_category_id: body.category_id,
    p_count: body.count ?? 1,
    p_unit: body.unit ?? 'count',
    p_date: body.date ?? new Date().toISOString().slice(0, 10),
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.CREATED(data);
});

/** PUT /api/ingredients — 장보기 항목 수정 */
export const PUT = withAuth(async (req: NextRequest, { supabase }) => {
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return apiResponse.BAD_REQUEST('CMN_002', 'id가 필요합니다.');
  }

  const patch = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined),
  ) as Json;

  const { data, error } = await supabase.rpc('update_ingredient_with_fridge', {
    p_ingredient_id: id,
    p_updates: patch,
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.OK(data);
});

/** DELETE /api/ingredients?id= — 장보기 항목 삭제 */
export const DELETE = withAuth(async (req: NextRequest, { supabase }) => {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get('id');

  if (!id) {
    return apiResponse.BAD_REQUEST('CMN_002', 'id가 필요합니다.');
  }

  const { error } = await supabase.rpc('delete_ingredient_with_cleanup', {
    p_ingredient_id: id,
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.NO_CONTENT();
});
