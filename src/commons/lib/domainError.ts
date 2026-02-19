/** 도메인별 커스텀 에러 코드 */
const DOMAIN_ERROR_CODE = {
  // A000x: 인증(Auth) 도메인
  AUTH_UNAUTHORIZED: 'A0001',
  COMMON_PERMISSION_DENIED: 'A0002',

  // F000x: 냉장고(Fridge) 도메인
  FRIDGE_IN_USE_IN_MEAL: 'F0001',
  FRIDGE_QUANTITY_MANAGED_IN_GROCERY: 'F0002',
  FRIDGE_QUANTITY_BELOW_MEAL_USAGE: 'F0003',
  FRIDGE_ITEM_NOT_FOUND: 'F0004',
  FRIDGE_BATCH_NOT_FOUND: 'F0005',
  FRIDGE_INVALID_QUANTITY: 'F0006',

  // C000x: 장보기(Cart) 도메인
  GROCERY_IN_USE_IN_MEAL: 'C0001',

  // H000x: 가구(Household) 도메인
  HOUSEHOLD_INVITE_INVALID_OR_EXPIRED: 'H0001',
  HOUSEHOLD_ALREADY_MEMBER: 'H0002',
  HOUSEHOLD_INVITE_MAX_USES_REACHED: 'H0003',

  // M000x: 식단(Meal) 도메인
  MEAL_STOCK_INSUFFICIENT: 'M0001',
  MEAL_NOT_FOUND: 'M0002',

  // I000x: 재료(Ingredient) 도메인 - 카테고리 관리
  INGREDIENT_CATEGORY_OTHER_DELETE_NOT_ALLOWED: 'I0001',
  INGREDIENT_CATEGORY_OTHER_NOT_FOUND: 'I0002',
  INGREDIENT_CATEGORY_ID_NOT_FOUND: 'I0003',
  INGREDIENT_CATEGORY_REPLACEMENT_NOT_FOUND: 'I0004',
  INGREDIENT_NOT_FOUND: 'I0005',
} as const;

type DomainErrorCodeKey = keyof typeof DOMAIN_ERROR_CODE;
type DomainErrorCode = (typeof DOMAIN_ERROR_CODE)[DomainErrorCodeKey];
interface DomainErrorPayload {
  code?: DomainErrorCode;
  hint?: DomainErrorCodeKey | null;
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
  // A000x: 인증(Auth) / 공통(Common) 도메인
  A0001: '로그인이 필요합니다.',
  A0002: '권한이 없습니다.',

  // F000x: 냉장고(Fridge) 도메인
  F0001: '식단에 등록되어 있는 재료는 삭제할 수 없습니다.',
  F0002: '장보기에서 등록한 재고는 장보기에서만 수량을 변경할 수 있습니다.',
  F0003: '식단에서 사용 중인 수량보다 작게 설정할 수 없습니다.',
  F0004: '냉장고 재료를 찾을 수 없습니다.',
  F0005: '재고 배치를 찾을 수 없습니다.',
  F0006: '유효하지 않은 수량입니다.',

  // C000x: 장보기(Cart) 도메인
  C0001: '식단에 등록되어 있는 재료는 삭제할 수 없습니다.',

  // H000x: 가구(Household) 도메인
  H0001: '유효하지 않거나 만료된 초대 코드입니다.',
  H0002: '이미 해당 가구의 구성원입니다.',
  H0003: '초대 코드 사용 횟수가 모두 소진되었습니다.',

  // M000x: 식단(Meal) 도메인
  M0001: '냉장고 재고가 부족합니다. 식단 재료 수량을 확인해 주세요.',
  M0002: '식단을 찾을 수 없습니다.',

  // I000x: 재료(Ingredient) 도메인 - 카테고리 관리
  I0001: '기본 카테고리(기타)는 삭제할 수 없습니다.',
  I0002: '기본 카테고리(기타)를 찾을 수 없습니다.',
  I0003: '유효하지 않은 카테고리입니다.',
  I0004: '대체할 기본 카테고리(기타)를 찾을 수 없습니다.',
  I0005: '재료를 찾을 수 없습니다.',
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

  if (domainCode && domainCode in DOMAIN_ERROR_MESSAGE) {
    return {
      code: domainCode,
      hint: domainHint,
      message: DOMAIN_ERROR_MESSAGE[domainCode],
    } as DomainErrorPayload;
  }

  if (domainHint && domainHint in DOMAIN_ERROR_CODE) {
    const mappedCode = DOMAIN_ERROR_CODE[domainHint];
    return {
      code: mappedCode,
      hint: domainHint,
      message: DOMAIN_ERROR_MESSAGE[mappedCode],
    } as DomainErrorPayload;
  }

  return null;
}

export { DOMAIN_ERROR_CODE, DOMAIN_ERROR_MESSAGE, resolveDomainError };
