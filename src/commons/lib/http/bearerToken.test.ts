import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseBearerToken } from './bearerToken';

describe('parseBearerToken', () => {
  it('Bearer 헤더에서 토큰을 꺼낸다', () => {
    assert.equal(parseBearerToken('Bearer abc.def.ghi'), 'abc.def.ghi');
  });

  it('스킴 대소문자와 앞뒤 공백은 무시한다', () => {
    assert.equal(parseBearerToken('  bearer   abc  '), 'abc');
  });

  it('헤더가 없거나 비어 있으면 null', () => {
    assert.equal(parseBearerToken(null), null);
    assert.equal(parseBearerToken(undefined), null);
    assert.equal(parseBearerToken(''), null);
  });

  it('Bearer가 아니거나 토큰이 없으면 null', () => {
    assert.equal(parseBearerToken('Basic dXNlcjpwYXNz'), null);
    assert.equal(parseBearerToken('Bearer'), null);
    assert.equal(parseBearerToken('Bearer a b'), null);
  });
});
