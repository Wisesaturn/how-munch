import { groupBy } from 'es-toolkit';

import { createSynonymIndex, matchTerm } from '@/commons/lib';

import { type VoiceFridgeItem, type VoiceItemMatcher } from './parseMeal';

/**
 * @description 냉장고 품목과 가구 유사어로 말한 표현을 찾는 함수를 만든다.
 * 이름, 브랜드+이름은 전체 일치까지 인정하고, 브랜드만 같으면 후보로만 본다.
 */
export function createFridgeItemMatcher(
  items: VoiceFridgeItem[],
  synonymTerms: Array<{ group_key: string; term: string }>,
): VoiceItemMatcher {
  const groups = groupBy(synonymTerms, (term) => term.group_key);
  const synonymIndex = createSynonymIndex(
    Object.entries(groups).map(([groupKey, terms]) => ({
      groupKey,
      terms: terms.map((term) => term.term),
    })),
  );

  return (term) =>
    matchTerm(
      items,
      term,
      (item) => (item.brand ? [item.name, `${item.brand}${item.name}`] : [item.name]),
      (item) => (item.brand ? [item.brand] : []),
      synonymIndex,
    );
}
