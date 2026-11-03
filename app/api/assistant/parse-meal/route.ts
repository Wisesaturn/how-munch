import { type NextRequest } from 'next/server';

import type Anthropic from '@anthropic-ai/sdk';

import { type AuthContext, withAuth } from '@/apps/route';

import { createAnthropic } from '@/commons/lib/anthropic';
import { apiResponse } from '@/commons/lib/http/apiResponse';

import {
  buildParseMealPrompt,
  extractJsonObject,
  resolveParsedMeal,
  type VoiceCategory,
  type VoiceFridgeItem,
} from '@/features/voice-meal-entry';

export const maxDuration = 60;

const PARSE_MEAL_MODEL = 'claude-sonnet-5-5';
const MAX_TOKENS = 2048;
const TEXT_MAX = 500;
/** 응답을 JSON으로 읽지 못하면 한 번만 다시 부른다 */
const MAX_ATTEMPTS = 2;

interface FridgeBatchRow {
  id: string;
  purchased_date: string;
  quantity: number;
  deleted_at: string | null;
}

/**
 * POST /api/assistant/parse-meal — 말하거나 적은 글을 식단, 냉장고 재고 차감, 외식비로 나눈다.
 * Claude는 날짜, 끼니, 메뉴, 재료 연결, 금액만 뽑고 구매분 선택과 재고 미리보기는 서버가 계산한다.
 * 저장은 하지 않는다. 클라이언트가 결과를 확인한 뒤 기존 식단, 외식비 저장 경로로 보낸다.
 */
export const POST = withAuth(async (req: NextRequest, { supabase }) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return apiResponse.INTERNAL_ERROR('AI 설정이 완료되지 않았습니다.');

  const body = await req.json();
  const householdId: unknown = body.householdId;
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, TEXT_MAX) : '';
  const today =
    typeof body.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
      ? body.today
      : new Date().toISOString().slice(0, 10);
  const now = typeof body.now === 'string' && /^\d{2}:\d{2}$/.test(body.now) ? body.now : '12:00';

  if (typeof householdId !== 'string' || !householdId) {
    return apiResponse.BAD_REQUEST('CMN_002', 'householdId가 필요합니다.');
  }
  if (!text) return apiResponse.BAD_REQUEST('CMN_002', '정리할 글이 필요합니다.');

  const { data: fridgeRows, error } = await supabase
    .from('fridge_items')
    .select('id, name, brand, unit, fridge_item_batches(id, purchased_date, quantity, deleted_at)')
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .order('name', { ascending: true });
  if (error) return apiResponse.INTERNAL_ERROR();

  const items: VoiceFridgeItem[] = (fridgeRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    brand: row.brand,
    unit: row.unit as VoiceFridgeItem['unit'],
    // 생성된 타입은 1:1 조인으로 잡지만 실제로는 구매분 배열이 온다
    batches: ((row.fridge_item_batches ?? []) as unknown as FridgeBatchRow[])
      .filter((batch) => batch.deleted_at === null)
      .map((batch) => ({
        id: batch.id,
        purchased_date: batch.purchased_date,
        quantity: Number(batch.quantity),
      })),
  }));

  const categories = await fetchCategories(supabase, householdId);

  const anthropic = createAnthropic(apiKey);
  const system = buildParseMealPrompt(items, today, now, categories);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let answer: string;
    try {
      const message = await anthropic.messages.create({
        model: PARSE_MEAL_MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: [{ role: 'user', content: text }],
      });
      answer = message.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('')
        .trim();
    } catch (err) {
      // 실제 원인은 서버 로그로만 남긴다
      console.error('[parse-meal] Claude 호출 실패', err);
      return apiResponse.INTERNAL_ERROR('말한 내용을 정리하지 못했어요.');
    }

    try {
      return apiResponse.OK(
        resolveParsedMeal(extractJsonObject(answer), items, { today, now, categories }),
      );
    } catch (err) {
      console.error(`[parse-meal] 응답 JSON 해석 실패 (${attempt}/${MAX_ATTEMPTS})`, err);
    }
  }

  return apiResponse.INTERNAL_ERROR('말한 내용을 정리하지 못했어요.');
});

/** 장보기 분류 목록 — 분류 목록 경로와 같이 전역 분류에 가구 분류를 code 기준으로 덮어쓴다 */
async function fetchCategories(
  supabase: AuthContext['supabase'],
  householdId: string,
): Promise<VoiceCategory[]> {
  const { data } = await supabase
    .from('ingredient_categories')
    .select('id, code, name, household_id')
    .or(`household_id.is.null,household_id.eq.${householdId}`)
    .order('sort_order', { ascending: true });

  const byCode = new Map<string, VoiceCategory>();
  for (const row of data ?? []) {
    if (byCode.has(row.code) && row.household_id !== householdId) continue;
    byCode.set(row.code, { id: row.id, code: row.code, label: row.name });
  }
  return [...byCode.values()];
}
