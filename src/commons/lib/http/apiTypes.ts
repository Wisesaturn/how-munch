/** Route Handler 표준 응답 형태 */
export type ApiResponse<T = undefined> = {
  status: number;
  code: string;
  message: string;
  data?: T;
  error?: unknown;
};
