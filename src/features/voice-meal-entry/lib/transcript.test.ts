import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { composeTranscript } from './transcript';

describe('composeTranscript', () => {
  it('확정 문장과 말하는 중인 문장을 띄어쓰기로 잇는다', () => {
    assert.equal(
      composeTranscript('', ['점심에 김치찌개 먹었고'], '15000원 냈어'),
      '점심에 김치찌개 먹었고 15000원 냈어',
    );
  });

  it('받아쓰기 전에 적어 둔 글을 앞에 둔다', () => {
    assert.equal(composeTranscript('오늘', ['점심에 김치찌개'], ''), '오늘 점심에 김치찌개');
  });

  it('빈 조각과 앞뒤 공백은 건너뛴다', () => {
    assert.equal(composeTranscript('  ', ['', ' 계란말이 '], '   '), '계란말이');
  });

  it('아무것도 없으면 빈 글을 돌려준다', () => {
    assert.equal(composeTranscript('', [], ''), '');
  });
});
