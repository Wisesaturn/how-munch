/** 도메인별 커스텀 에러 코드 (XXX_NNN 규격) */
const DOMAIN_ERROR_CODE = {
  // AUT: 인증(Auth) 도메인
  AUTH_UNAUTHORIZED: 'AUT_001',
  COMMON_PERMISSION_DENIED: 'AUT_002',

  // FRG: 냉장고(Fridge) 도메인
  FRIDGE_IN_USE_IN_MEAL: 'FRG_001',
  FRIDGE_QUANTITY_MANAGED_IN_GROCERY: 'FRG_002',
  FRIDGE_QUANTITY_BELOW_MEAL_USAGE: 'FRG_003',
  FRIDGE_ITEM_NOT_FOUND: 'FRG_004',
  FRIDGE_BATCH_NOT_FOUND: 'FRG_005',
  FRIDGE_INVALID_QUANTITY: 'FRG_006',

  // GRC: 장보기(Grocery) 도메인
  GROCERY_IN_USE_IN_MEAL: 'GRC_001',

  // HSH: 가구(Household) 도메인
  HOUSEHOLD_INVITE_INVALID_OR_EXPIRED: 'HSH_001',
  HOUSEHOLD_ALREADY_MEMBER: 'HSH_002',
  HOUSEHOLD_INVITE_MAX_USES_REACHED: 'HSH_003',

  // MEL: 식단(Meal) 도메인
  MEAL_STOCK_INSUFFICIENT: 'MEL_001',
  MEAL_NOT_FOUND: 'MEL_002',
  MEAL_DISH_NOT_FOUND: 'MEL_003',

  // ING: 재료(Ingredient) 도메인
  INGREDIENT_CATEGORY_OTHER_DELETE_NOT_ALLOWED: 'ING_001',
  INGREDIENT_CATEGORY_OTHER_NOT_FOUND: 'ING_002',
  INGREDIENT_CATEGORY_ID_NOT_FOUND: 'ING_003',
  INGREDIENT_CATEGORY_REPLACEMENT_NOT_FOUND: 'ING_004',
  INGREDIENT_NOT_FOUND: 'ING_005',
} as const;

type DomainErrorCodeKey = keyof typeof DOMAIN_ERROR_CODE;
type DomainApiCode = (typeof DOMAIN_ERROR_CODE)[DomainErrorCodeKey];

interface DomainErrorPayload {
  code: DomainApiCode;
  hint?: DomainErrorCodeKey | null;
  message: string;
}

interface DatabaseErrorLike {
  code?: string;
  message?: string;
  hint?: string | null;
  details?: string | null;
}

/** 도메인 에러 코드별 사용자 메시지 */
const DOMAIN_ERROR_MESSAGE: Record<DomainApiCode, string> = {
  // AUT
  AUT_001: '로그인이 필요합니다.',
  AUT_002: '권한이 없습니다.',

  // FRG
  FRG_001: '식단에 등록되어 있는 재료는 삭제할 수 없습니다.',
  FRG_002: '장보기에서 등록한 재고는 장보기에서만 수량을 변경할 수 있습니다.',
  FRG_003: '식단에서 사용 중인 수량보다 작게 설정할 수 없습니다.',
  FRG_004: '냉장고 재료를 찾을 수 없습니다.',
  FRG_005: '재고 배치를 찾을 수 없습니다.',
  FRG_006: '유효하지 않은 수량입니다.',

  // GRC
  GRC_001: '식단에 등록되어 있는 재료는 삭제할 수 없습니다.',

  // HSH
  HSH_001: '유효하지 않거나 만료된 초대 코드입니다.',
  HSH_002: '이미 해당 가구의 구성원입니다.',
  HSH_003: '초대 코드 사용 횟수가 모두 소진되었습니다.',

  // MEL
  MEL_001: '냉장고 재고가 부족합니다. 식단 재료 수량을 확인해 주세요.',
  MEL_002: '식단을 찾을 수 없습니다.',
  MEL_003: '메뉴를 찾을 수 없습니다.',

  // ING
  ING_001: '기본 카테고리(기타)는 삭제할 수 없습니다.',
  ING_002: '기본 카테고리(기타)를 찾을 수 없습니다.',
  ING_003: '유효하지 않은 카테고리입니다.',
  ING_004: '대체할 기본 카테고리(기타)를 찾을 수 없습니다.',
  ING_005: '재료를 찾을 수 없습니다.',
};

/**
 * PostgreSQL 레거시 errcode → DomainErrorCodeKey 폴백 매핑.
 * RPC hint가 없는 경우 errcode로 도메인 에러를 식별한다.
 */
const POSTGRES_ERRCODE_TO_KEY: Partial<Record<string, DomainErrorCodeKey>> = {
  A0001: 'AUTH_UNAUTHORIZED',
  A0002: 'COMMON_PERMISSION_DENIED',
  F0001: 'FRIDGE_IN_USE_IN_MEAL',
  F0002: 'FRIDGE_QUANTITY_MANAGED_IN_GROCERY',
  F0003: 'FRIDGE_QUANTITY_BELOW_MEAL_USAGE',
  F0004: 'FRIDGE_ITEM_NOT_FOUND',
  F0005: 'FRIDGE_BATCH_NOT_FOUND',
  F0006: 'FRIDGE_INVALID_QUANTITY',
  C0001: 'GROCERY_IN_USE_IN_MEAL',
  H0001: 'HOUSEHOLD_INVITE_INVALID_OR_EXPIRED',
  H0002: 'HOUSEHOLD_ALREADY_MEMBER',
  H0003: 'HOUSEHOLD_INVITE_MAX_USES_REACHED',
  M0001: 'MEAL_STOCK_INSUFFICIENT',
  M0002: 'MEAL_NOT_FOUND',
  M0003: 'MEAL_DISH_NOT_FOUND',
  I0001: 'INGREDIENT_CATEGORY_OTHER_DELETE_NOT_ALLOWED',
  I0002: 'INGREDIENT_CATEGORY_OTHER_NOT_FOUND',
  I0003: 'INGREDIENT_CATEGORY_ID_NOT_FOUND',
  I0004: 'INGREDIENT_CATEGORY_REPLACEMENT_NOT_FOUND',
  I0005: 'INGREDIENT_NOT_FOUND',
};

/**
 * @description unknown 에러를 DB 에러 형태로 안전하게 변환합니다.
 */
function toDatabaseError(error: unknown) {
  return error as DatabaseErrorLike | null;
}

/**
 * @description PostgreSQL 커스텀 에러에서 도메인 에러 페이로드를 추출합니다.
 * hint 기반 lookup을 우선하고, 없으면 레거시 errcode 매핑으로 폴백합니다.
 */
function resolveDomainError(error: unknown): DomainErrorPayload | null {
  const dbError = toDatabaseError(error);
  if (!dbError) return null;

  // 1. hint 기반 lookup (권장: hint = 'FRIDGE_IN_USE_IN_MEAL')
  const domainHint = dbError.hint as DomainErrorCodeKey | null;
  if (domainHint && domainHint in DOMAIN_ERROR_CODE) {
    const mappedCode = DOMAIN_ERROR_CODE[domainHint];
    return {
      code: mappedCode,
      hint: domainHint,
      message: DOMAIN_ERROR_MESSAGE[mappedCode],
    };
  }

  // 2. 레거시 PostgreSQL errcode 폴백 (F0001 → FRG_001)
  const pgCode = dbError.code;
  if (pgCode && pgCode in POSTGRES_ERRCODE_TO_KEY) {
    const key = POSTGRES_ERRCODE_TO_KEY[pgCode]!;
    const mappedCode = DOMAIN_ERROR_CODE[key];
    return {
      code: mappedCode,
      hint: key,
      message: DOMAIN_ERROR_MESSAGE[mappedCode],
    };
  }

  return null;
}

export { DOMAIN_ERROR_CODE, DOMAIN_ERROR_MESSAGE, resolveDomainError };
