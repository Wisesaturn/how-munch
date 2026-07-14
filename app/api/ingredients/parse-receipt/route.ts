import { type NextRequest } from 'next/server';

import Anthropic from '@anthropic-ai/sdk';

import { withAuth } from '@/apps/route';

import { apiResponse } from '@/commons/lib/http/apiResponse';

import { type IngredientCategoryOption } from '@/entities/ingredient-category';

import { buildReceiptPrompt, parseAiResponse } from '@/features/ingredient';

/** Vision 응답이 수십 초까지 걸릴 수 있어 여유 있게 설정 */
export const maxDuration = 60;

const RECEIPT_MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 8192;

const SUPPORTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

function isSupportedMediaType(value: unknown): value is SupportedMediaType {
  return typeof value === 'string' && SUPPORTED_MEDIA_TYPES.includes(value as SupportedMediaType);
}

/**
 * POST /api/ingredients/parse-receipt — 영수증 이미지를 Claude Vision으로 분석해 StagedItem[]으로 반환한다.
 * Claude 호출 → 텍스트 응답을 parseAiResponse로 파싱(category_id 매핑·중복 병합·날짜 보정)까지 서버에서 처리한다.
 * 날짜 보정 기준일(today)은 클라이언트 로컬 날짜를 받아 서버 타임존(UTC) 편차를 방지한다.
 */
export const POST = withAuth(async (req: NextRequest) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return apiResponse.INTERNAL_ERROR('AI 설정이 완료되지 않았습니다.');

  const body = await req.json();
  const imageBase64: unknown = body.imageBase64;
  const mimeType: unknown = body.mimeType;
  const categories: IngredientCategoryOption[] = Array.isArray(body.categories)
    ? body.categories
    : [];
  const today: unknown = body.today;
  const resolvedToday =
    typeof today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(today) ? today : undefined;

  if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
    return apiResponse.BAD_REQUEST('CMN_002', '이미지가 필요합니다.');
  }
  if (!isSupportedMediaType(mimeType)) {
    return apiResponse.BAD_REQUEST('CMN_002', '지원하지 않는 이미지 형식입니다.');
  }
  if (categories.length === 0) {
    return apiResponse.BAD_REQUEST('CMN_002', '카테고리 정보가 필요합니다.');
  }

  const anthropic = new Anthropic({ apiKey });

  let text: string;
  try {
    const message = await anthropic.messages.create({
      model: RECEIPT_MODEL,
      max_tokens: MAX_TOKENS,
      system: buildReceiptPrompt(categories),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: imageBase64 },
            },
            { type: 'text', text: '이 영수증 이미지를 분석해서 JSON으로만 응답해줘.' },
          ],
        },
      ],
    });

    text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();
  } catch (err) {
    // 실제 원인은 서버 로그로만 남기고, 프로덕션 응답에는 내부 예외를 노출하지 않는다
    console.error('[parse-receipt] Vision 호출 실패', err);
    return apiResponse.INTERNAL_ERROR(
      '영수증 분석에 실패했어요. 다시 시도해 주세요.',
      process.env.NODE_ENV === 'production' ? undefined : err,
    );
  }

  if (!text) {
    return apiResponse.INTERNAL_ERROR('영수증에서 항목을 읽지 못했어요. 다시 시도해 주세요.');
  }

  try {
    const items = parseAiResponse(text, categories, resolvedToday);
    return apiResponse.OK({ items });
  } catch (err) {
    return apiResponse.BAD_REQUEST(
      'CMN_002',
      err instanceof Error ? err.message : '분석 결과를 처리하지 못했어요.',
      err,
    );
  }
});
