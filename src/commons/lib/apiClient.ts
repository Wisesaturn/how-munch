import qs from 'qs';

import { type ApiResponse } from './apiResponse';

type RequestOptions = Omit<RequestInit, 'body'> & {
  /** qs로 직렬화되는 query params. 중첩 객체/배열(repeat)/null 지원 */
  params?: Record<string, unknown>;
};

/**
 * @description fetch 기반 HTTP 요청 공통 함수.
 * ApiResponse 형태를 자동 파싱하고 실패 시 에러를 throw한다.
 * query params는 qs(arrayFormat: repeat)로 직렬화한다.
 */
async function request<T>(url: string, options?: RequestOptions & { body?: unknown }): Promise<T> {
  const queryString = options?.params
    ? qs.stringify(options.params, { addQueryPrefix: true, skipNulls: true, arrayFormat: 'repeat' })
    : '';

  const { params: _params, body, ...restOptions } = options ?? {};

  const res = await fetch(`${url}${queryString}`, {
    ...restOptions,
    headers: { 'Content-Type': 'application/json', ...restOptions.headers },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  const json: ApiResponse<T> = await res.json();
  if (!res.ok) throw new Error(json.message);
  return json.data as T;
}

/**
 * @description fetch 기반 API 클라이언트. axios interceptor와 같은 역할.
 * ApiResponse 형태를 자동 파싱하고, 실패 시 TanStack Query의 onError로 에러를 전달한다.
 */
export const apiClient = {
  /** @description GET 요청. params는 qs(arrayFormat: repeat)로 query string 직렬화 */
  get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    return request<T>(url, { method: 'GET', params });
  },
  /** @description POST 요청 */
  post<T>(url: string, body: unknown): Promise<T> {
    return request<T>(url, { method: 'POST', body });
  },
  /** @description PUT 요청 */
  put<T>(url: string, body: unknown): Promise<T> {
    return request<T>(url, { method: 'PUT', body });
  },
  /** @description DELETE 요청 */
  delete<T = void>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, { method: 'DELETE', ...(body !== undefined && { body }) });
  },
};
