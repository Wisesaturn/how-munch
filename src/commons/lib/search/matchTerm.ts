import { containsSearchText, normalizeSearchText } from './hangulSearch';
import { expandWithSynonyms, type SynonymIndex } from './synonym';

/** 말 안에 품목 이름이 들어 있다고 볼 최소 길이. '김'이 '김치찌개'에 걸리는 것을 막는다 */
const MIN_NAME_LENGTH_IN_TERM = 2;

export interface TermMatch<T> {
  /** 하나로 좁혀진 항목. 고를 후보가 남아 있으면 null */
  best: T | null;
  /** best가 이름 전체 일치로 좁혀졌는지. 부분일치나 후보 1건으로 좁혀졌으면 false */
  isWhole: boolean;
  /** 말과 걸리는 항목 전체 */
  candidates: T[];
}

/**
 * @description 완성된 단어 하나를 목록에서 찾아 자동으로 연결할 항목과 후보를 가린다.
 * 이름 전체 일치 1건, 유사어 전체 일치 1건, 후보 1건 순서로 좁히고, 그 밖에는 후보만 돌려준다.
 * 말은 조합 중인 글자가 아니므로 초성, 조합 중간 매칭은 쓰지 않는다.
 * `getNames`는 전체 일치까지 인정할 이름을, `getTexts`는 부분일치만 인정할 글을 돌려준다.
 */
export function matchTerm<T>(
  items: readonly T[],
  term: string,
  getNames: (item: T) => string[],
  getTexts: (item: T) => string[],
  synonymIndex: SynonymIndex,
): TermMatch<T> {
  const normalizedTerm = normalizeSearchText(term);
  if (!normalizedTerm) return { best: null, isWhole: false, candidates: [] };

  const synonyms = expandWithSynonyms(term, synonymIndex).map(normalizeSearchText);

  const candidates = items.filter((item) => {
    const names = getNames(item);
    const texts = [...names, ...getTexts(item)];
    return (
      texts.some((text) => containsSearchText(text, term)) ||
      names.some((name) => isNameInTerm(name, normalizedTerm)) ||
      synonyms.some((synonym) => texts.some((text) => containsSearchText(text, synonym)))
    );
  });

  const wholeMatches = candidates.filter((item) =>
    getNames(item).some((name) => normalizeSearchText(name) === normalizedTerm),
  );
  if (wholeMatches.length === 1) {
    return { best: wholeMatches[0], isWhole: true, candidates };
  }
  if (wholeMatches.length > 1) return { best: null, isWhole: false, candidates };

  const synonymMatches = candidates.filter((item) =>
    getNames(item).some((name) => synonyms.includes(normalizeSearchText(name))),
  );
  if (synonymMatches.length === 1) {
    return { best: synonymMatches[0], isWhole: true, candidates };
  }
  if (synonymMatches.length > 1) return { best: null, isWhole: false, candidates };

  return { best: candidates.length === 1 ? candidates[0] : null, isWhole: false, candidates };
}

/** "국산두부"처럼 말에 수식어가 붙어 품목 이름을 품고 있는지 본다 */
function isNameInTerm(name: string, normalizedTerm: string) {
  const normalizedName = normalizeSearchText(name);
  return (
    normalizedName.length >= MIN_NAME_LENGTH_IN_TERM && normalizedTerm.includes(normalizedName)
  );
}
