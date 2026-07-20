import { type NextRequest } from 'next/server';

import { withAuth } from '@/apps/route';

import { apiResponse } from '@/commons/lib/http/apiResponse';

/** GET /api/meals/fridge-items?householdId=&selectedIds= — 식단 편집용 냉장고 재고 조회 */
export const GET = withAuth(async (req: NextRequest, { userId, supabase }) => {
  const { searchParams } = req.nextUrl;
  const householdId = searchParams.get('householdId');
  const selectedIds = searchParams.getAll('selectedIds').filter(Boolean);

  if (!householdId) {
    return apiResponse.BAD_REQUEST('CMN_002', 'householdId가 필요합니다.');
  }

  const { data: fridgePreferences } = await supabase
    .from('fridge_preferences')
    .select('hide_depleted_fridge_items')
    .eq('user_id', userId)
    .maybeSingle();

  const hideDepletedFridgeItems = fridgePreferences?.hide_depleted_fridge_items ?? false;

  let query = supabase
    .from('fridge_items')
    .select(
      'id, name, brand, total_count, unit, fridge_item_batches(id, purchased_date, quantity, expiry_date, deleted_at)',
    )
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .order('brand', { ascending: true, nullsFirst: true });

  if (hideDepletedFridgeItems) {
    if (selectedIds.length > 0) {
      query = query.or(`total_count.gt.0,id.in.(${selectedIds.join(',')})`);
    } else {
      query = query.gt('total_count', 0);
    }
  }

  const { data, error } = await query;
  if (error) return apiResponse.INTERNAL_ERROR();

  return apiResponse.OK(data ?? []);
});
