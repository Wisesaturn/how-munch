const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;

/**
 * @description `Authorization: Bearer <token>` 헤더 값에서 토큰을 꺼낸다. 형식이 다르면 null
 */
export function parseBearerToken(authorization: string | null | undefined): string | null {
  if (!authorization) return null;
  return BEARER_PATTERN.exec(authorization.trim())?.[1] ?? null;
}
