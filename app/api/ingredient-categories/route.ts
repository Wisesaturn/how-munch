import { type NextRequest } from 'next/server';

import { apiResponse } from '@/commons/lib/apiResponse';
import { withAuth } from '@/commons/lib/routeGuard';

function decodeEmojiUnicode(emojiUnicode: string) {
  const normalized = emojiUnicode.trim().replace(/^U\+/i, '').replace(/\s+/g, '');
  const codepointHexList = normalized.split('-').filter(Boolean);

  if (codepointHexList.length === 0) return '';

  const codepoints = codepointHexList
    .map((codepointHex) => Number.parseInt(codepointHex, 16))
    .filter(Number.isFinite);

  if (codepoints.length === 0) return '';

  return String.fromCodePoint(...codepoints);
}

/** GET /api/ingredient-categories?householdId= — 카테고리 목록 조회 (전역 + 가구 커스텀 병합) */
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  const { searchParams } = req.nextUrl;
  const householdId = searchParams.get('householdId');

  let query = supabase
    .from('ingredient_categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  query = householdId
    ? query.or(`household_id.is.null,household_id.eq.${householdId}`)
    : query.is('household_id', null);

  const { data, error } = await query;
  if (error) return apiResponse.OK([]);

  const rows = data ?? [];
  if (rows.length === 0) return apiResponse.OK([]);

  const categoryByCode = new Map<string, object>();

  for (const row of rows) {
    const emoji = decodeEmojiUnicode(row.emoji_unicode);
    const option = {
      id: row.id,
      code: row.code,
      label: row.name,
      emoji: emoji || '📦',
      emojiUnicode: row.emoji_unicode,
      sortOrder: row.sort_order,
    };

    const isHouseholdCategory = householdId !== null && row.household_id === householdId;
    if (!categoryByCode.has(row.code) || isHouseholdCategory) {
      categoryByCode.set(row.code, option);
    }
  }

  const mergedCategories = [...categoryByCode.values()].sort((a, b) => {
    const aOption = a as { sortOrder: number; code: string };
    const bOption = b as { sortOrder: number; code: string };
    if (aOption.sortOrder !== bOption.sortOrder) return aOption.sortOrder - bOption.sortOrder;
    return aOption.code.localeCompare(bOption.code);
  });

  return apiResponse.OK(mergedCategories);
});
