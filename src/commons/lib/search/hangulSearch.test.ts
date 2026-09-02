import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  containsSearchText,
  isChoseongQuery,
  matchesSearchText,
  normalizeSearchText,
} from './hangulSearch';
import { createSynonymIndex, expandWithSynonyms } from './synonym';

describe('normalizeSearchText', () => {
  it('공백과 특수문자를 제거하고 소문자로 낮춘다', () => {
    assert.equal(normalizeSearchText('연어 초밥 (10입)'), '연어초밥10입');
    assert.equal(normalizeSearchText('CJ 해찬들'), 'cj해찬들');
  });
});

describe('matchesSearchText — 공백 무시 부분일치', () => {
  it('띄어쓰기가 다른 실제 재고명을 찾는다', () => {
    assert.equal(matchesSearchText('대패 삼겹살', '대패삼겹살'), true);
    assert.equal(matchesSearchText('얇은피 고기 만두(냉동)', '고기만두'), true);
    assert.equal(matchesSearchText('보성홍차 아이스티_한라봉', '보성홍차한라봉'), false);
  });

  it('수식어가 앞에 붙어도 부분일치로 찾는다', () => {
    assert.equal(matchesSearchText('무항생제 신선한 대란', '대란'), true);
    assert.equal(matchesSearchText('곰곰 신선한 1A 우유', '우유'), true);
  });

  it('관련 없는 단어는 매칭하지 않는다', () => {
    assert.equal(matchesSearchText('무항생제 신선한 대란', '계란'), false);
    assert.equal(matchesSearchText('올리브유', '기름'), false);
  });
});

describe('matchesSearchText — 초성 검색', () => {
  it('2글자 이상 초성으로 찾는다', () => {
    assert.equal(matchesSearchText('계란', 'ㄱㄹ'), true);
    assert.equal(matchesSearchText('무항생제 신선한 대란', 'ㄷㄹ'), true);
    assert.equal(matchesSearchText('CJ 해찬들 새콤달콤', 'ㅎㅊㄷ'), true);
  });

  it('1글자 초성은 후보가 과도해지므로 매칭하지 않는다', () => {
    assert.equal(matchesSearchText('계란', 'ㄱ'), false);
    assert.equal(matchesSearchText('감자', 'ㄱ'), false);
  });

  it('초성이 다르면 매칭하지 않는다', () => {
    assert.equal(matchesSearchText('계란', 'ㅇㄹ'), false);
  });
});

describe('matchesSearchText — 한글 조합 중간 상태', () => {
  it('타이핑 도중의 조합 상태로도 찾는다', () => {
    assert.equal(matchesSearchText('계란', '곌'), true);
    assert.equal(matchesSearchText('삼겹살', '삼겹'), true);
  });
});

describe('isChoseongQuery', () => {
  it('초성만 입력한 경우를 구분한다', () => {
    assert.equal(isChoseongQuery('ㄱㄹ'), true);
    assert.equal(isChoseongQuery('계란'), false);
    assert.equal(isChoseongQuery('ㅏㅣ'), false);
  });
});

describe('containsSearchText — 동의어 확장어용 단순 부분일치', () => {
  it('공백만 무시하고 부분일치한다', () => {
    assert.equal(containsSearchText('달걀 대란', '대란'), true);
    assert.equal(containsSearchText('무항생제 신선한 대란', '대란'), true);
  });

  it('초성이나 조합 중간 상태는 매칭하지 않는다', () => {
    assert.equal(containsSearchText('계란', 'ㄱㄹ'), false);
    assert.equal(containsSearchText('계란', '곌'), false);
  });
});

describe('expandWithSynonyms', () => {
  const index = createSynonymIndex([
    { groupKey: 'g1', terms: ['계란', '달걀', '대란', '왕란'] },
    { groupKey: 'g2', terms: ['우유', '밀크'] },
  ]);

  it('그룹은 대칭이라 어느 단어로 조회해도 나머지를 돌려준다', () => {
    assert.deepEqual(expandWithSynonyms('계란', index), ['달걀', '대란', '왕란']);
    assert.deepEqual(expandWithSynonyms('왕란', index), ['계란', '달걀', '대란']);
  });

  it('그룹에 없는 단어는 빈 배열이다', () => {
    assert.deepEqual(expandWithSynonyms('두부', index), []);
  });

  it('공백·대소문자가 달라도 같은 그룹으로 조회된다', () => {
    assert.deepEqual(expandWithSynonyms(' 계란 ', index), ['달걀', '대란', '왕란']);
  });
});

describe('통합 — 계란 검색으로 실제 재고명을 찾는 경로', () => {
  const index = createSynonymIndex([{ groupKey: 'g1', terms: ['계란', '달걀', '대란', '왕란'] }]);
  const stock = ['무항생제 신선한 대란', '달걀 왕란', '계란', '두부', '곰곰 우유'];

  it('직접 일치와 동의어 일치를 나눈다', () => {
    const exact = stock.filter((name) => matchesSearchText(name, '계란'));
    const expanded = expandWithSynonyms('계란', index);
    const similar = stock.filter(
      (name) => !exact.includes(name) && expanded.some((term) => containsSearchText(name, term)),
    );

    assert.deepEqual(exact, ['계란']);
    assert.deepEqual(similar, ['무항생제 신선한 대란', '달걀 왕란']);
  });
});
