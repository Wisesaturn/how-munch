/**
 * @description 이미지 File을 canvas로 리사이즈/압축해 Claude Vision 전송용 base64 페이로드로 변환한다.
 * 긴 변을 maxEdge(px) 이하로 축소하고 JPEG로 재인코딩해 업로드 용량을 줄인다.
 * data URL prefix를 제거한 순수 base64 문자열과 고정 mimeType('image/jpeg')을 반환한다.
 */
export async function compressReceiptImage(
  file: File,
  maxEdge = 1568,
  quality = 0.8,
): Promise<{ base64: string; mimeType: 'image/jpeg' }> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('이미지를 처리할 수 없습니다.');
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const base64 = dataUrl.split(',')[1] ?? '';

  return { base64, mimeType: 'image/jpeg' };
}
