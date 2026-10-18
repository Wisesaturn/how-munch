import qs from 'qs';

import { createClient } from '../../api/supabase/client';
import { API_BASE_URL } from '../../config/api';

import { type ApiResponse } from './apiTypes';

type RequestOptions = Omit<RequestInit, 'body'> & {
  /** qs로 직렬화되는 query params. 중첩 객체/배열(repeat)/null 지원 */
  params?: Record<string, unknown>;
};

/**
 * @description 브라우저 Supabase 세션의 access token. 세션이 없거나 서버에서 부르면 null
 */
async function getAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const {
    data: { session },
  } = await createClient().auth.getSession();
  return session?.access_token ?? null;
}

/**
 * @description API 서버로 보내는 fetch. 응답 파싱 없이 Response를 그대로 돌려준다.
 * path 앞에 API_BASE_URL을 붙이고, 세션이 있으면 `Authorization: Bearer` 헤더를 넣는다.
 * 상태 코드로 분기해야 하는 호출(예: 204/404/410)은 apiClient 대신 이 함수를 쓴다
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Authorization')) {
    const accessToken = await getAccessToken();
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}

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

  const headers = new Headers(restOptions.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const res = await apiFetch(`${url}${queryString}`, {
    ...restOptions,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  if (res.status === 204) return undefined as T;

  const json: ApiResponse<T> = await res.json();
  if (!res.ok) throw new Error(json.message, { cause: json.error });
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
  /** @description PATCH 요청 */
  patch<T>(url: string, body: unknown): Promise<T> {
    return request<T>(url, { method: 'PATCH', body });
  },
  /** @description DELETE 요청 */
  delete<T = void>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, { method: 'DELETE', ...(body !== undefined && { body }) });
  },
};
