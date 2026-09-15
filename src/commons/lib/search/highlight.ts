/** 원문을 매칭 구간과 아닌 구간으로 쪼갠 조각 */
export interface HighlightSegment {
  text: string;
  matched: boolean;
}

/**
 * @description 원문을 검색어 목록 기준으로 매칭 구간과 아닌 구간으로 쪼갠다.
 * 서버가 ILIKE로 걸러오므로 대소문자를 무시하고 부분 문자열로 찾는다.
 * 검색어가 유사어로 확장된 경우, 실제로 그 행에 들어 있는 단어가 매칭으로 잡힌다.
 * 긴 단어를 먼저 시도해 짧은 단어가 긴 단어의 일부만 끊어가는 것을 막는다.
 */
export function splitByMatchedTerms(text: string, terms: string[]): HighlightSegment[] {
  const needles = [...new Set(terms.map((term) => term.trim().toLowerCase()).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );

  if (!text || needles.length === 0) return [{ text, matched: false }];

  const haystack = text.toLowerCase();
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const hit = needles
      .map((needle) => ({ needle, index: haystack.indexOf(needle, cursor) }))
      .filter(({ index }) => index !== -1)
      .sort((a, b) => a.index - b.index || b.needle.length - a.needle.length)[0];

    if (!hit) break;

    if (hit.index > cursor) {
      segments.push({ text: text.slice(cursor, hit.index), matched: false });
    }
    segments.push({
      text: text.slice(hit.index, hit.index + hit.needle.length),
      matched: true,
    });
    cursor = hit.index + hit.needle.length;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), matched: false });
  }

  return segments;
}
