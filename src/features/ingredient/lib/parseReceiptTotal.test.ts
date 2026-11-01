import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseReceiptTotal } from './parseReceiptTotal.js';

describe('parseReceiptTotal', () => {
  it('영수증 합계를 읽는다', () => {
    assert.equal(parseReceiptTotal('{"receipt_total": 16800, "items": []}'), 16800);
  });

  it('없거나 잘못된 값은 null이다', () => {
    assert.equal(parseReceiptTotal('{"receipt_total": null, "items": []}'), null);
    assert.equal(parseReceiptTotal('{"receipt_total": "16800"}'), null);
    assert.equal(parseReceiptTotal('{"receipt_total": 0}'), null);
    assert.equal(parseReceiptTotal('{"items": []}'), null);
    assert.equal(parseReceiptTotal('{깨진 JSON}'), null);
  });
});
