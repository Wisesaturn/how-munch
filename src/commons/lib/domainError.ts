/** 도메인별 커스텀 에러 코드 */
const DOMAIN_ERROR_CODE = {
  // F000x: 냉장고(Fridge) 도메인
  FRIDGE_IN_USE_IN_MEAL: 'F0001',
  FRIDGE_QUANTITY_MANAGED_IN_GROCERY: 'F0002',
  FRIDGE_QUANTITY_BELOW_MEAL_USAGE: 'F0003',

  // C000x: 장보기(Cart) 도메인
  GROCERY_IN_USE_IN_MEAL: 'C0001',

  // M000x: 식단(Meal) 도메인
  MEAL_STOCK_INSUFFICIENT: 'M0001',
} as const;

type DomainErrorCodeKey = keyof typeof DOMAIN_ERROR_CODE;
type DomainErrorCode = (typeof DOMAIN_ERROR_CODE)[DomainErrorCodeKey];
interface DomainErrorPayload {
  code: DomainErrorCode;
  message: string;
}

interface DatabaseErrorLike {
  code?: string;
  message?: string;
  hint?: DomainErrorCodeKey | null;
  details?: string | null;
}

/** 도메인 에러 코드별 사용자 메시지 */
const DOMAIN_ERROR_MESSAGE: Record<DomainErrorCode, string> = {
  // F000x: 냉장고(Fridge) 도메인
  F0001: '식단에 등록되어 있는 재료는 삭제할 수 없습니다.',
  F0002: '장보기에서 등록한 재고는 장보기에서만 수량을 변경할 수 있습니다.',
  F0003: '식단에서 사용 중인 수량보다 작게 설정할 수 없습니다.',

  // C000x: 장보기(Cart) 도메인
  C0001: '식단에 등록되어 있는 재료는 삭제할 수 없습니다.',

  // M000x: 식단(Meal) 도메인
  M0001: '냉장고 재고가 부족합니다. 식단 재료 수량을 확인해 주세요.',
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
  const domainHint = dbError.hint as DomainErrorCodeKey | null;
  if (!(domainCode && domainCode in DOMAIN_ERROR_MESSAGE)) return null;

  return {
    code: domainCode,
    hint: domainHint,
    message: dbError.message ?? DOMAIN_ERROR_MESSAGE[domainCode],
  } as DomainErrorPayload;
}

export { DOMAIN_ERROR_CODE, DOMAIN_ERROR_MESSAGE, resolveDomainError };
