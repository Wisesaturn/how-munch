import { disassemble, getChoseong } from 'es-hangul';

/** 검색어가 초성 자음으로만 이루어졌는지 판별하는 패턴 (모음 단독 입력은 제외) */
const CHOSEONG_ONLY_PATTERN = /^[ㄱ-ㅎ]+$/;

/** 검색 비교에서 제외할 문자 (공백·구두점·기호) */
const NON_SEARCHABLE_PATTERN = /[\s\p{P}\p{S}]/gu;

/**
 * 초성 검색을 허용하는 최소 입력 길이.
 * 1글자('ㄱ')만으로는 후보가 지나치게 넓어져 검색 결과가 사실상 전체 목록이 된다.
 */
const MIN_CHOSEONG_QUERY_LENGTH = 2;

/**
 * @description 검색 비교용으로 텍스트를 정규화한다. 소문자로 낮추고 공백·구두점·기호를 제거해
 * "대패 삼겹살"과 "대패삼겹살"이 같은 문자열로 비교되도록 만든다.
 * 제거 대상을 화이트리스트가 아닌 블랙리스트로 두어, 한자·가나처럼 다른 문자 체계로 된
 * 이름이 통째로 비워져 검색에서 사라지는 일이 없게 한다.
 */
export function normalizeSearchText(text: string): string {
  return text.toLowerCase().replace(NON_SEARCHABLE_PATTERN, '');
}

/**
 * @description 검색어가 초성만으로 입력됐는지 판별한다. ('ㄱㄹ' → true, '계란' → false)
 */
export function isChoseongQuery(query: string): boolean {
  return CHOSEONG_ONLY_PATTERN.test(normalizeSearchText(query));
}

/**
 * @description 대상 텍스트가 검색어와 확실하게 일치하는지 판별한다. 직접 일치 판정에 사용한다.
 * 1) 공백·구두점 무시 부분일치 — "대패삼겹살" → "대패 삼겹살"
 * 2) 초성 검색 (2글자 이상) — "ㄱㄹ" → "계란"
 *
 * 한글 조합 중간 상태는 여기 포함하지 않는다. 조합 중간 매칭은 원리상 음절 경계를 넘나들어
 * ('달'에 ㄱ을 더하면 '닭'이 되듯) '닭'이 '달걀'에 걸리는 것을 막을 수 없기 때문에,
 * 재고를 골라 차감하는 화면에서 직접 일치로 제시하면 오선택 위험이 있다.
 * matchesComposingText로 분리해 '비슷한 이름'으로 내려보낸다.
 */
export function matchesSearchText(target: string, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedTarget = normalizeSearchText(target);

  if (!normalizedQuery || !normalizedTarget) return false;

  if (CHOSEONG_ONLY_PATTERN.test(normalizedQuery)) {
    if (normalizedQuery.length < MIN_CHOSEONG_QUERY_LENGTH) return false;
    return getChoseong(normalizedTarget).includes(normalizedQuery);
  }

  return normalizedTarget.includes(normalizedQuery);
}

/**
 * @description 한글 조합 중간 상태로 대상 텍스트를 매칭한다. ('곌' → '계란', '계라' → '계란')
 *
 * 자모로 분해해 부분일치시키므로, 타이핑 도중 글자가 조합되는 동안에도 결과가 유지된다.
 * 다만 앞 음절의 종성과 뒤 음절의 초성이 이어붙는 특성상 '닭'이 '달걀'에 걸리는 등
 * 의도와 다른 매칭이 함께 생긴다. 그래서 직접 일치와 분리해 두고 호출부에서
 * '비슷한 이름'으로 낮춰 노출한다.
 */
export function matchesComposingText(target: string, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedTarget = normalizeSearchText(target);

  if (!normalizedQuery || !normalizedTarget) return false;
  if (CHOSEONG_ONLY_PATTERN.test(normalizedQuery)) return false;

  return disassemble(normalizedTarget).includes(disassemble(normalizedQuery));
}

/**
 * @description 대상 텍스트가 특정 단어를 포함하는지 판별한다.
 * 공백·대소문자만 무시하는 단순 부분일치이며, 동의어로 확장된 단어에 사용한다.
 * 확장어에까지 초성·조합 매칭을 적용하면 후보가 과하게 넓어지기 때문에 분리해 둔다.
 */
export function containsSearchText(target: string, term: string): boolean {
  const normalizedTerm = normalizeSearchText(term);
  const normalizedTarget = normalizeSearchText(target);

  if (!normalizedTerm || !normalizedTarget) return false;

  return normalizedTarget.includes(normalizedTerm);
}
