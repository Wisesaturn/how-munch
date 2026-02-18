import { useQuery } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';
import { CATEGORIES } from '@/commons/config';

import { type IngredientCategory, type IngredientCategoryOption } from '../model/types';

import { ingredientCategoryKeys } from './queryKey';

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

function toCategoryOption(row: IngredientCategory): IngredientCategoryOption {
  const emoji = decodeEmojiUnicode(row.emoji_unicode);

  return {
    id: row.code,
    code: row.code,
    label: row.name,
    emoji: emoji || '📦',
    emojiUnicode: row.emoji_unicode,
    sortOrder: row.sort_order,
  };
}

function createFallbackCategories(): IngredientCategoryOption[] {
  return CATEGORIES.map((category, index) => ({
    id: category.id,
    code: category.id,
    label: category.label,
    emoji: category.emoji,
    emojiUnicode: '',
    sortOrder: (index + 1) * 10,
  }));
}

/** 카테고리 목록 조회 (전역 + 현재 가구 커스텀 병합) */
export function useIngredientCategoriesQuery(householdId: string | null) {
  return useQuery({
    queryKey: ingredientCategoryKeys.list(householdId ?? 'global'),
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('ingredient_categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      query = householdId
        ? query.or(`household_id.is.null,household_id.eq.${householdId}`)
        : query.is('household_id', null);

      const { data, error } = await query;
      if (error) {
        return createFallbackCategories();
      }

      const rows = (data ?? []) as IngredientCategory[];
      if (rows.length === 0) {
        return createFallbackCategories();
      }

      const categoryByCode = new Map<string, IngredientCategoryOption>();
      for (const row of rows) {
        const next = toCategoryOption(row);
        const prev = categoryByCode.get(row.code);
        const isHouseholdCategory = householdId !== null && row.household_id === householdId;

        if (!prev || isHouseholdCategory) {
          categoryByCode.set(row.code, next);
        }
      }

      const mergedCategories = [...categoryByCode.values()].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.code.localeCompare(b.code);
      });

      return mergedCategories.length > 0 ? mergedCategories : createFallbackCategories();
    },
  });
}
