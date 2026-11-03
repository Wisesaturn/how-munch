import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';

import { type ParsedMealResult } from '../lib';

interface ScribeTokenResponse {
  token: string;
}

/** ElevenLabs 실시간 받아쓰기용 1회용 토큰 발급(15분, 한 번 쓰면 만료) */
export function useIssueScribeTokenMutation() {
  return useMutation({
    mutationFn: () => apiClient.post<ScribeTokenResponse>('/api/scribe-token', {}),
  });
}

interface ParseMealInput {
  householdId: string;
  text: string;
  /** 클라이언트 로컬 날짜 YYYY-MM-DD */
  today: string;
  /** 클라이언트 로컬 시각 HH:mm, 끼니를 짐작할 때 쓴다 */
  now: string;
}

/** 말한 글을 식단, 냉장고 재고 차감, 외식비로 나눈다. 저장은 하지 않는다 */
export function useParseMealMutation() {
  return useMutation({
    mutationFn: (input: ParseMealInput) =>
      apiClient.post<ParsedMealResult>('/api/assistant/parse-meal', input),
  });
}
