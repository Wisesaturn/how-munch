import { withAuth } from '@/apps/route';

import { apiResponse } from '@/commons/lib/http/apiResponse';

const SCRIBE_TOKEN_URL = 'https://api.elevenlabs.io/v1/single-use-token/realtime_scribe';

/**
 * POST /api/scribe-token — 브라우저가 ElevenLabs 실시간 받아쓰기(scribe_v2_realtime)에 붙을 1회용 토큰을 발급한다.
 * 토큰은 15분 뒤 만료되고 한 번 쓰면 사라진다. API 키는 서버에만 두고 응답에 싣지 않는다.
 */
export const POST = withAuth(async () => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return apiResponse.INTERNAL_ERROR('음성 인식 설정이 완료되지 않았습니다.');

  try {
    const res = await fetch(SCRIBE_TOKEN_URL, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('[scribe-token] ElevenLabs 토큰 발급 실패', res.status);
      return apiResponse.INTERNAL_ERROR('음성 인식 연결을 준비하지 못했습니다.');
    }

    const body: unknown = await res.json();
    const token = (body as { token?: unknown } | null)?.token;
    if (typeof token !== 'string' || token.length === 0) {
      console.error('[scribe-token] ElevenLabs 응답에 토큰이 없음');
      return apiResponse.INTERNAL_ERROR('음성 인식 연결을 준비하지 못했습니다.');
    }

    return apiResponse.OK({ token });
  } catch (error) {
    console.error('[scribe-token] ElevenLabs 호출 실패', error);
    return apiResponse.INTERNAL_ERROR('음성 인식 연결을 준비하지 못했습니다.');
  }
});
