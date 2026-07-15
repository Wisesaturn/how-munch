import { format } from 'date-fns';

import { type IngredientUnit, parseProductNameUnit } from '@/entities/ingredient';
import { type IngredientCategoryOption } from '@/entities/ingredient-category';

export interface StagedItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  count: number;
  unit: IngredientUnit;
  store: string;
  date: string;
  category_code: string;
  category_id: string;
}

/**
 * @description name + price + store + date + category_code + unit이 모두 같은 항목을 하나로 병합하고 count와 price를 함께 합산한다.
 * price는 개당 단가가 아니라 해당 품목의 총 지출액이므로, 동일 항목이 여러 줄로 찍혀 병합될 때 지출액이 유실되지 않도록 price도 누적한다.
 * unit을 키에 포함해 표기 방식이 달라 단위가 갈린 항목이 잘못 합산되지 않도록 한다.
 */
function mergeDuplicates(items: StagedItem[]): StagedItem[] {
  const seen = new Map<string, StagedItem>();

  for (const item of items) {
    const key = `${item.name}|${item.price}|${item.store}|${item.date}|${item.category_code}|${item.unit}`;
    const existing = seen.get(key);
    if (existing) {
      existing.count += item.count;
      existing.price += item.price;
    } else {
      seen.set(key, { ...item });
    }
  }

  return Array.from(seen.values());
}

/**
 * @description Claude AI 응답 텍스트를 파싱해 StagedItem 배열로 변환한다.
 * JSON 블록 추출 → 유효성 검사 → category_code를 category_id로 매핑 → 중복 항목 병합 순으로 처리한다.
 * 날짜를 특정할 수 없는 항목은 today로 보정한다. 서버 실행 시 타임존이 어긋나지 않도록
 * 호출자(클라이언트 로컬 날짜)가 today를 주입할 수 있으며, 미주입 시 실행 환경의 오늘로 폴백한다.
 * 파싱 실패 시 사용자에게 보여줄 한국어 에러 메시지와 함께 throw한다.
 */
export function parseAiResponse(
  text: string,
  categories: IngredientCategoryOption[],
  today: string = format(new Date(), 'yyyy-MM-dd'),
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

      const name = typeof item['name'] === 'string' ? item['name'].trim() : '';
      const receiptCount = typeof item['count'] === 'number' ? item['count'] : 1;
      const { count, unit } = parseProductNameUnit(name, receiptCount);

      return {
        id: crypto.randomUUID(),
        name,
        brand: '',
        price: typeof item['price'] === 'number' ? Math.round(item['price']) : 0,
        count,
        unit,
        store: typeof item['store'] === 'string' ? item['store'].trim() : '',
        date:
          typeof item['date'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item['date'])
            ? item['date']
            : today,
        category_code: code,
        category_id: categoryMap.get(code) ?? otherId,
      };
    })
    .filter((item) => item.name.length > 0);

  return mergeDuplicates(mapped);
}
