import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { matchTerm } from './matchTerm';
import { createSynonymIndex } from './synonym';

interface Item {
  name: string;
  brand?: string;
}

const SYNONYMS = createSynonymIndex([
  { groupKey: 'egg', terms: ['계란', '달걀'] },
  { groupKey: 'pork', terms: ['돼지고기', '삼겹살', '목살'] },
]);

function match(names: Array<string | Item>, term: string) {
  const items: Item[] = names.map((item) => (typeof item === 'string' ? { name: item } : item));
  const result = matchTerm(
    items,
    term,
    (item) => (item.brand ? [item.name, `${item.brand}${item.name}`] : [item.name]),
    (item) => (item.brand ? [item.brand] : []),
    SYNONYMS,
  );
  return {
    best: result.best?.name ?? null,
    isWhole: result.isWhole,
    candidates: result.candidates.map((item) => item.name),
  };
}

describe('matchTerm', () => {
  it('이름 전체 일치가 1건이면 부분일치 후보가 있어도 그것으로 좁힌다', () => {
    const result = match(['우유', '딸기우유'], '우유');
    assert.equal(result.best, '우유');
    assert.equal(result.isWhole, true);
    assert.deepEqual(result.candidates, ['우유', '딸기우유']);
  });

  it('이름 전체 일치가 없고 후보가 여럿이면 고르게 둔다', () => {
    const result = match(['서울우유', '딸기우유'], '우유');
    assert.equal(result.best, null);
    assert.deepEqual(result.candidates, ['서울우유', '딸기우유']);
  });

  it('이름이 같은 품목이 여럿이면 고르게 둔다', () => {
    const result = match(
      [
        { name: '우유', brand: '서울우유' },
        { name: '우유', brand: '매일' },
      ],
      '우유',
    );
    assert.equal(result.best, null);
    assert.equal(result.candidates.length, 2);
  });

  it('브랜드와 이름을 함께 말하면 그 품목의 전체 일치로 본다', () => {
    const result = match(
      [
        { name: '우유', brand: '서울' },
        { name: '우유', brand: '매일' },
      ],
      '서울 우유',
    );
    assert.equal(result.best, '우유');
    assert.equal(result.isWhole, true);
  });

  it('후보가 1건뿐이면 부분일치도 연결하되 전체 일치로 표시하지 않는다', () => {
    const result = match(['딸기우유'], '우유');
    assert.equal(result.best, '딸기우유');
    assert.equal(result.isWhole, false);
  });

  it('유사어로 이름 전체가 같은 품목이 1건이면 연결한다', () => {
    const result = match(['계란', '계란말이'], '달걀');
    assert.equal(result.best, '계란');
    assert.equal(result.isWhole, true);
  });

  it('유사어 그룹의 품목이 여럿이면 고르게 둔다', () => {
    const result = match(['삼겹살', '목살'], '돼지고기');
    assert.equal(result.best, null);
    assert.deepEqual(result.candidates, ['삼겹살', '목살']);
  });

  it('말에 수식어가 붙어 품목 이름을 품고 있어도 찾는다', () => {
    assert.equal(match(['두부'], '국산 두부').best, '두부');
  });

  it('한 글자 품목 이름은 긴 말 안에 있어도 후보로 보지 않는다', () => {
    assert.deepEqual(match(['김'], '김치').candidates, []);
  });

  it('조합 중간 매칭은 쓰지 않아 닭이 달걀에 걸리지 않는다', () => {
    assert.deepEqual(match(['달걀'], '닭').candidates, []);
  });

  it('초성만으로는 찾지 않는다', () => {
    assert.deepEqual(match(['계란'], 'ㄱㄹ').candidates, []);
  });

  it('못 찾으면 후보가 비어 있다', () => {
    const result = match(['계란'], '식빵');
    assert.equal(result.best, null);
    assert.deepEqual(result.candidates, []);
  });
});
