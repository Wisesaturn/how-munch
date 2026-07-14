import { NextResponse } from 'next/server';

import { type ApiResponse } from './apiTypes';

function json<T>(body: ApiResponse<T>): Response {
  return NextResponse.json(body, { status: body.status });
}

/**
 * @description 예외 객체를 응답에 실을 수 있는 형태로 정규화한다.
 * Error는 name/message(+ 중첩 cause)만 추출하고 스택은 제외하며, 그 외 값은 그대로 반환한다.
 */
function normalizeError(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(error.cause !== undefined && { cause: normalizeError(error.cause) }),
    };
  }
  return error;
}

/**
 * @description Route Handler에서 표준 ApiResponse 형태의 Response를 생성하는 유틸.
 * 성공/실패 상태를 status(HTTP), code(도메인 XXX_NNN), message(한국어)로 일원화한다.
 * 4xx/5xx 응답에는 선택적으로 error를 실어 catch로 떨어진 실제 예외 원인을 전달할 수 있다.
 */
export const apiResponse = {
  /** 200 OK */
  OK<T>(data: T, message = '성공'): Response {
    return json<T>({ status: 200, code: 'SUCCESS', message, data });
  },
  /** 201 Created */
  CREATED<T>(data: T, message = '생성되었습니다.'): Response {
    return json<T>({ status: 201, code: 'SUCCESS', message, data });
  },
  /** 204 No Content */
  NO_CONTENT(): Response {
    return new Response(null, { status: 204 });
  },
  /** 400 Bad Request */
  BAD_REQUEST(code: string, message: string, error?: unknown): Response {
    return json({
      status: 400,
      code,
      message,
      ...(error !== undefined && { error: normalizeError(error) }),
    });
  },
  /** 401 Unauthorized */
  UNAUTHORIZED(message = '인증이 필요합니다.'): Response {
    return json({ status: 401, code: 'AUT_001', message });
  },
  /** 403 Forbidden */
  FORBIDDEN(code: string, message: string): Response {
    return json({ status: 403, code, message });
  },
  /** 404 Not Found */
  NOT_FOUND(code: string, message: string): Response {
    return json({ status: 404, code, message });
  },
  /** 409 Conflict */
  CONFLICT(code: string, message: string, error?: unknown): Response {
    return json({
      status: 409,
      code,
      message,
      ...(error !== undefined && { error: normalizeError(error) }),
    });
  },
  /** 500 Internal Server Error */
  INTERNAL_ERROR(message = '서버 오류가 발생했습니다.', error?: unknown): Response {
    return json({
      status: 500,
      code: 'CMN_001',
      message,
      ...(error !== undefined && { error: normalizeError(error) }),
    });
  },
};
