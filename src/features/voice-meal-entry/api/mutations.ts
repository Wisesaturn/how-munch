import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';

interface ScribeTokenResponse {
  token: string;
}

/** ElevenLabs 실시간 받아쓰기용 1회용 토큰 발급(15분, 한 번 쓰면 만료) */
export function useIssueScribeTokenMutation() {
  return useMutation({
    mutationFn: () => apiClient.post<ScribeTokenResponse>('/api/scribe-token', {}),
  });
}
