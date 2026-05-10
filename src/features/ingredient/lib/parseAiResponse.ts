import { format } from 'date-fns';

import { type IngredientUnit } from '@/entities/ingredient';
import { type IngredientCategoryOption } from '@/entities/ingredient-category';

export interface StagedItem {
  id: string;
  name: string;
  price: number;
  count: number;
  unit: IngredientUnit;
  store: string;
  date: string;
  category_code: string;
  category_id: string;
}

/**
 * @description name + price + store + date + category_code가 모두 같은 항목을 하나로 병합하고 count를 합산한다.
 */
function mergeDuplicates(items: StagedItem[]): StagedItem[] {
  const seen = new Map<string, StagedItem>();

  for (const item of items) {
    const key = `${item.name}|${item.price}|${item.store}|${item.date}|${item.category_code}`;
    const existing = seen.get(key);
    if (existing) {
      existing.count += item.count;
    } else {
      seen.set(key, { ...item });
    }
  }

  return Array.from(seen.values());
}

/**
 * @description Claude AI 응답 텍스트를 파싱해 StagedItem 배열로 변환한다.
 * JSON 블록 추출 → 유효성 검사 → category_code를 category_id로 매핑 → 중복 항목 병합 순으로 처리한다.
 * 파싱 실패 시 사용자에게 보여줄 한국어 에러 메시지와 함께 throw한다.
 */
export function parseAiResponse(
  text: string,
  categories: IngredientCategoryOption[],
): StagedItem[] {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch)
    throw new Error('JSON 형식을 찾을 수 없습니다. Claude 답변을 그대로 붙여넣어 주세요.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('올바른 JSON 형식이 아닙니다. Claude 답변을 그대로 붙여넣어 주세요.');
  }

  if (typeof parsed !== 'object' || parsed === null || !('items' in parsed)) {
    throw new Error('items 키가 없습니다. 프롬프트를 다시 확인해 주세요.');
  }

  const { items } = parsed as { items: unknown };
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('분석된 품목이 없습니다.');
  }

  const categoryMap = new Map(categories.map((c) => [c.code, c.id]));
  const validCodes = new Set(categories.map((c) => c.code));
  const otherId = categories.find((c) => c.code === 'other')?.id ?? '';

  const mapped = items
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => {
      const code =
        typeof item['category_code'] === 'string' && validCodes.has(item['category_code'])
          ? item['category_code']
          : 'other';

      return {
        id: crypto.randomUUID(),
        name: typeof item['name'] === 'string' ? item['name'].trim() : '',
        price: typeof item['price'] === 'number' ? Math.round(item['price']) : 0,
        count: typeof item['count'] === 'number' ? item['count'] : 1,
        unit: 'count' as IngredientUnit,
        store: typeof item['store'] === 'string' ? item['store'].trim() : '',
        date:
          typeof item['date'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item['date'])
            ? item['date']
            : format(new Date(), 'yyyy-MM-dd'),
        category_code: code,
        category_id: categoryMap.get(code) ?? otherId,
      };
    })
    .filter((item) => item.name.length > 0);

  return mergeDuplicates(mapped);
}
