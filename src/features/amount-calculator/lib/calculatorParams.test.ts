import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseCalculatorAmount, parseCalculatorNullable } from './calculatorParams';

describe('parseCalculatorAmount', () => {
  it('숫자와 URL에서 복원된 문자열을 금액으로 변환한다', () => {
    assert.equal(parseCalculatorAmount(12000), 12000);
    assert.equal(parseCalculatorAmount('12000'), 12000);
    assert.equal(parseCalculatorAmount('0'), 0);
  });

  it('값이 없거나 금액이 아니면 null을 돌려준다', () => {
    assert.equal(parseCalculatorAmount(undefined), null);
    assert.equal(parseCalculatorAmount(''), null);
    assert.equal(parseCalculatorAmount('abc'), null);
  });
});

describe('parseCalculatorNullable', () => {
  it('true와 복원된 문자열만 허용한다', () => {
    assert.equal(parseCalculatorNullable(true), true);
    assert.equal(parseCalculatorNullable('true'), true);
    assert.equal(parseCalculatorNullable(undefined), false);
    assert.equal(parseCalculatorNullable('false'), false);
  });
});
