/**
 * @description 이메일 문자열을 트림하고 소문자로 정규화합니다.
 */
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
