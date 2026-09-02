import { disassemble, getChoseong } from 'es-hangul';

/** 검색어가 초성 자음으로만 이루어졌는지 판별하는 패턴 (모음 단독 입력은 제외) */
const CHOSEONG_ONLY_PATTERN = /^[ㄱ-ㅎ]+$/;

/** 검색 비교에서 제외할 문자 (공백·기호·괄호 등) */
const NON_SEARCHABLE_PATTERN = /[^0-9a-z가-힣ㄱ-ㅎㅏ-ㅣ]/g;

/**
 * 초성 검색을 허용하는 최소 입력 길이.
 * 1글자('ㄱ')만으로는 후보가 지나치게 넓어져 검색 결과가 사실상 전체 목록이 된다.
 */
const MIN_CHOSEONG_QUERY_LENGTH = 2;

/**
 * @description 검색 비교용으로 텍스트를 정규화한다. 소문자로 낮추고 공백·특수문자를 제거해
 * "대패 삼겹살"과 "대패삼겹살"이 같은 문자열로 비교되도록 만든다.
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
 * @description 대상 텍스트가 검색어와 일치하는지 판별한다. 세 가지 입력 방식을 함께 처리한다.
 * 1) 공백·특수문자 무시 부분일치 — "대패삼겹살" → "대패 삼겹살"
 * 2) 초성 검색 (2글자 이상) — "ㄱㄹ" → "계란"
 * 3) 한글 조합 중간 상태 — "곌" → "계란"
 * 2)를 제외한 나머지는 자모 분해 문자열의 부분일치 하나로 함께 처리된다.
 */
export function matchesSearchText(target: string, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedTarget = normalizeSearchText(target);

  if (!normalizedQuery || !normalizedTarget) return false;

  if (CHOSEONG_ONLY_PATTERN.test(normalizedQuery)) {
    if (normalizedQuery.length < MIN_CHOSEONG_QUERY_LENGTH) return false;
    return getChoseong(normalizedTarget).includes(normalizedQuery);
  }

  return disassemble(normalizedTarget).includes(disassemble(normalizedQuery));
}

/**
 * @description 대상 텍스트가 특정 단어를 포함하는지 판별한다.
 * 공백·대소문자만 무시하는 단순 부분일치이며, 동의어로 확장된 단어에 사용한다.
 * 확장어에까지 초성·조합 중간 매칭을 적용하면 후보가 과하게 넓어지기 때문에 분리해 둔다.
 */
export function containsSearchText(target: string, term: string): boolean {
  const normalizedTerm = normalizeSearchText(term);
  const normalizedTarget = normalizeSearchText(target);

  if (!normalizedTerm || !normalizedTarget) return false;

  return normalizedTarget.includes(normalizedTerm);
}
