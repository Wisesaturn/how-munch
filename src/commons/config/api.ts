/**
 * API 서버 주소. 값이 없으면 같은 출처의 상대 경로(/api/*)로 부른다(web 빌드).
 * .ait 화면은 tossmini 도메인에서 열리므로 Vercel 배포 주소를 넣어 원격으로 부른다.
 * 빌드 시점에 인라인되도록 process.env.NEXT_PUBLIC_API_BASE_URL을 그대로 적어 읽는다(구조 분해 금지)
 */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '');
