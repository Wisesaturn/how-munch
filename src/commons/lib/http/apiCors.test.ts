import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { API_CORS_ALLOWED_ORIGINS, getApiCorsHeaders } from './apiCors';

describe('getApiCorsHeaders', () => {
  it('tossmini 실제 서비스와 샌드박스 출처를 허용한다', () => {
    for (const origin of API_CORS_ALLOWED_ORIGINS) {
      const headers = getApiCorsHeaders(origin);
      assert.equal(headers?.['Access-Control-Allow-Origin'], origin);
      assert.match(headers?.['Access-Control-Allow-Headers'] ?? '', /Authorization/);
      assert.equal(headers?.Vary, 'Origin');
    }
  });

  it('쿠키를 보내지 않으므로 Allow-Credentials를 붙이지 않는다', () => {
    const headers = getApiCorsHeaders(API_CORS_ALLOWED_ORIGINS[0]);
    assert.equal(headers?.['Access-Control-Allow-Credentials'], undefined);
  });

  it('출처가 없거나 목록에 없으면 null', () => {
    assert.equal(getApiCorsHeaders(null), null);
    assert.equal(getApiCorsHeaders('https://evil.example.com'), null);
    assert.equal(getApiCorsHeaders('https://other-app.apps.tossmini.com'), null);
    assert.equal(getApiCorsHeaders('http://how-munch.apps.tossmini.com'), null);
  });
});
