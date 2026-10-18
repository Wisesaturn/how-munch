/** apps-in-toss.config.ts의 appName. 콘솔 등록 뒤 바꿀 수 없으니 바뀌면 함께 고친다 */
const AIT_APP_NAME = 'how-munch';

/**
 * .ait 화면이 열리는 출처(SDK 3.1.0 이상).
 * https://developers-apps-in-toss.toss.im/documentation/integration/server-api 'CORS 허용하기'
 */
export const API_CORS_ALLOWED_ORIGINS = [
  `https://${AIT_APP_NAME}.apps.tossmini.com`, // 실제 서비스
  `https://${AIT_APP_NAME}.private-apps.tossmini.com`, // 콘솔 QR 테스트(샌드박스)
] as const;

const API_CORS_ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const API_CORS_ALLOWED_HEADERS = 'Authorization, Content-Type';
const API_CORS_MAX_AGE_SECONDS = 60 * 60 * 24;

/**
 * @description 요청 출처가 허용 목록에 있으면 붙일 CORS 응답 헤더, 아니면 null.
 * 인증은 Bearer 헤더로 하므로 쿠키를 보내지 않는다(Allow-Credentials 없음)
 */
export function getApiCorsHeaders(origin: string | null): Record<string, string> | null {
  if (!origin || !(API_CORS_ALLOWED_ORIGINS as readonly string[]).includes(origin)) return null;

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': API_CORS_ALLOWED_METHODS,
    'Access-Control-Allow-Headers': API_CORS_ALLOWED_HEADERS,
    'Access-Control-Max-Age': String(API_CORS_MAX_AGE_SECONDS),
    Vary: 'Origin',
  };
}
