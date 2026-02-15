import { josa } from 'es-hangul';

export interface LengthProps {
  fieldName: string;
  length: number | string;
}

export interface RangeProps {
  fieldName: string;
  min: number | string;
  max: number | string;
}

/**
 * @description 공통 에러 메시지 템플릿
 */
export const ERROR_MSG = {
  INPUT: {
    MIN: ({ fieldName, length }: LengthProps) =>
      `${josa(fieldName, '은/는')} 최소 ${length}자 이상 입력해야 합니다.` as const,
    MAX: ({ fieldName, length }: LengthProps) =>
      `${josa(fieldName, '은/는')} 최대 ${length}자까지 입력할 수 있습니다.` as const,
    REQUIRED: ({ fieldName }: { fieldName: string }) =>
      `${josa(fieldName, '을/를')} 입력해주세요.` as const,
    EMPTY: ({ fieldName }: { fieldName: string }) =>
      `${josa(fieldName, '이/가')} 비어 있습니다.` as const,
  },
  SELECT: {
    REQUIRED: ({ fieldName }: { fieldName: string }) =>
      `${josa(fieldName, '을/를')} 선택해주세요.` as const,
    MIN: ({ fieldName, length }: LengthProps) =>
      `${josa(fieldName, '은/는')} 최소 ${length}개 이상 선택해야 합니다.` as const,
    MAX: ({ fieldName, length }: LengthProps) =>
      `${josa(fieldName, '은/는')} 최대 ${length}개까지 선택할 수 있습니다.` as const,
  },
  REGISTER: {
    MIN: ({ fieldName, length }: LengthProps) =>
      `${josa(fieldName, '은/는')} 최소 ${length}개 이상 등록해야 합니다.` as const,
    MAX: ({ fieldName, length }: LengthProps) =>
      `${josa(fieldName, '은/는')} 최대 ${length}개까지 등록할 수 있습니다.` as const,
    REQUIRED: ({ fieldName }: { fieldName: string }) =>
      `${josa(fieldName, '을/를')} 등록해주세요.` as const,
  },
  FORMAT: {
    INVALID: ({ fieldName }: { fieldName: string }) =>
      `${josa(fieldName, '이/가')} 유효한 형식이 아닙니다.` as const,
    MISMATCH: ({ fieldName }: { fieldName: string }) =>
      `${josa(fieldName, '이/가')} 일치하지 않습니다.` as const,
  },
  RANGE: {
    BETWEEN: ({ fieldName, min, max }: RangeProps) =>
      `${josa(fieldName, '은/는')} ${min}부터 ${max}사이의 값을 입력해야 합니다.` as const,
    GREATER_THAN: ({ fieldName, min }: Omit<RangeProps, 'max'>) =>
      `${josa(fieldName, '은/는')} ${min} 초과여야 합니다.` as const,
    LESS_THAN: ({ fieldName, max }: Omit<RangeProps, 'min'>) =>
      `${josa(fieldName, '은/는')} ${max} 미만이어야 합니다.` as const,
    MIN: ({ fieldName, min }: Omit<RangeProps, 'max'>) =>
      `${josa(fieldName, '은/는')} ${min} 이상이어야 합니다.` as const,
    MAX: ({ fieldName, max }: Omit<RangeProps, 'min'>) =>
      `${josa(fieldName, '은/는')} ${max} 이하여야 합니다.` as const,
  },
  DUPLICATE: {
    EXISTS: ({ fieldName }: { fieldName: string }) =>
      `${josa(fieldName, '이/가')} 중복되었습니다.` as const,
    NOT_ALLOWED: ({ fieldName }: { fieldName: string }) =>
      `${josa(fieldName, '은/는')} 중복 사용할 수 없습니다.` as const,
  },
  UPLOAD: {
    REQUIRED: ({ fieldName }: { fieldName: string }) =>
      `${josa(fieldName, '을/를')} 업로드해주세요.` as const,
    INVALID_TYPE: ({ fieldName }: { fieldName: string }) =>
      `${fieldName} 파일 형식이 올바르지 않습니다.` as const,
    MAX_SIZE: ({ fieldName, length }: LengthProps) =>
      `${josa(fieldName, '은/는')} 최대 ${length}까지 업로드할 수 있습니다.` as const,
    FAILED: ({ fieldName }: { fieldName: string }) =>
      `${fieldName} 업로드에 실패했습니다.` as const,
  },
  DELETE: {
    CONFIRM: ({ fieldName }: { fieldName: string }) =>
      `${josa(fieldName, '을/를')} 삭제하시겠습니까?` as const,
    SUCCESS: ({ fieldName }: { fieldName: string }) =>
      `${josa(fieldName, '이/가')} 삭제되었습니다.` as const,
    FAILED: ({ fieldName }: { fieldName: string }) => `${fieldName} 삭제에 실패했습니다.` as const,
  },
  MODIFY: {
    CONFIRM: ({ fieldName }: { fieldName: string }) =>
      `${josa(fieldName, '을/를')} 수정하시겠습니까?` as const,
    SUCCESS: ({ fieldName }: { fieldName: string }) =>
      `${josa(fieldName, '이/가')} 수정되었습니다.` as const,
    FAILED: ({ fieldName }: { fieldName: string }) => `${fieldName} 수정에 실패했습니다.` as const,
  },
  COMMON: {
    UNKNOWN: [
      '알 수 없는 오류가 발생했습니다.',
      '새로고침 후 다시 시도해주세요.',
      '위 상태가 계속될 경우 고객센터(1588-9784)로 연락해주세요.',
    ].join('\n'),
    NETWORK_ERROR: ['네트워크 오류가 발생했습니다.', '잠시 후 다시 시도해주세요.'].join('\n'),
    SERVER_ERROR: ['서버 오류가 발생했습니다.', '잠시 후 다시 시도해주세요.'].join('\n'),
    SESSION_EXPIRED: ['세션이 만료되었습니다.', '창을 닫고 다시 시도해주세요.'].join('\n'),
    NOT_FOUND: ({ fieldName }: { fieldName: string }) =>
      `${josa(fieldName, '을/를')} 찾을 수 없습니다.` as const,
  },
} as const;
