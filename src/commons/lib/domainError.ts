/** 도메인별 커스텀 에러 코드 */
const DOMAIN_ERROR_CODE = {
  FRIDGE_IN_USE_IN_MEAL: 'F0001',
  GROCERY_IN_USE_IN_MEAL: 'C0001',
} as const;

type DomainErrorKey = keyof typeof DOMAIN_ERROR_CODE;
type DomainErrorCode = (typeof DOMAIN_ERROR_CODE)[keyof typeof DOMAIN_ERROR_CODE];
interface DomainErrorPayload {
  code: DomainErrorCode;
  message: string;
}

interface DatabaseErrorLike {
  code?: DomainErrorCode;
  message?: string;
  hint?: DomainErrorKey | null;
  details?: string | null;
}

/** 도메인 에러 코드별 사용자 메시지 */
const DOMAIN_ERROR_MESSAGE: Record<DomainErrorCode, string> = {
  F0001: '식단에 등록되어 있는 재료는 삭제할 수 없습니다.',
  C0001: '식단에 등록되어 있는 재료는 삭제할 수 없습니다.',
};

/**
 * @description unknown 에러를 DB 에러 형태로 안전하게 변환합니다.
 */
function toDatabaseError(error: unknown) {
  return error as DatabaseErrorLike | null;
}

/**
 * @description PostgreSQL 커스텀 에러(P0001)에서 공통 도메인 메시지를 추출합니다.
 */
function resolveDomainError(error: unknown) {
  const dbError = toDatabaseError(error);
  if (!dbError) return null;

  const domainCode = dbError.code as DomainErrorCode | null;
  if (!(domainCode && domainCode in DOMAIN_ERROR_MESSAGE)) return null;

  return {
    code: domainCode,
    message: dbError.message ?? DOMAIN_ERROR_MESSAGE[domainCode],
  } as DomainErrorPayload;
}

export { DOMAIN_ERROR_CODE, DOMAIN_ERROR_MESSAGE, resolveDomainError };
