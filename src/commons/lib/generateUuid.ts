/**
 * Math.random 기반 UUID v4 생성기
 * 보안 토큰 용도가 아닌 클라이언트 식별자 생성 용도로만 사용한다.
 */
export function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
