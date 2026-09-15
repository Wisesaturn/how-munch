import { resolveDomainError } from '@/commons/lib';
import { apiResponse } from '@/commons/lib/http/apiResponse';

/** 도메인 에러로 매핑됐을 때 쓸 HTTP 상태 */
type MappedStatus = 'conflict' | 'badRequest';

/**
 * @description Supabase/Postgres 에러를 도메인 에러로 변환해 응답한다.
 * 매핑되지 않은 에러는 서버 로그에 원본을 남기고, 개발 환경에서는 응답에도 실어
 * "CMN_001 서버 오류"만 보고 원인을 못 찾는 상황을 막는다.
 */
export function respondWithDbError(
  error: unknown,
  context: string,
  mappedStatus: MappedStatus = 'conflict',
): Response {
  const domainError = resolveDomainError(error);

  if (domainError) {
    return mappedStatus === 'badRequest'
      ? apiResponse.BAD_REQUEST(domainError.code, domainError.message)
      : apiResponse.CONFLICT(domainError.code, domainError.message);
  }

  console.error(`[${context}] 매핑되지 않은 데이터베이스 에러`, error);

  return apiResponse.INTERNAL_ERROR(
    '서버 오류가 발생했습니다.',
    process.env.NODE_ENV === 'production' ? undefined : error,
  );
}
