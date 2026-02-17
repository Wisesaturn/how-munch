import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseSafeNumericInput } from './numericInput';

describe('parseSafeNumericInput', () => {
  it('kg 입력: 소수점 1자리까지만 유지한다', () => {
    const result = parseSafeNumericInput('12.34', { decimalScale: 1 });
    assert.equal(result.text, '12.3');
    assert.equal(result.value, 12.3);
    assert.equal(result.hasTrailingDot, false);
  });

  it('g 입력: 소수점을 제거해 숫자만 유지한다', () => {
    const result = parseSafeNumericInput('123.45', { decimalScale: 0 });
    assert.equal(result.text, '12345');
    assert.equal(result.value, 12345);
    assert.equal(result.hasTrailingDot, false);
  });

  it('입력 중간 상태(마침표로 끝남)를 유지한다', () => {
    const result = parseSafeNumericInput('23.', { decimalScale: 1 });
    assert.equal(result.text, '23');
    assert.equal(result.value, null);
    assert.equal(result.hasTrailingDot, true);
  });

  it('숫자가 아닌 문자를 제거한다', () => {
    const result = parseSafeNumericInput('abc12.3def', { decimalScale: 1 });
    assert.equal(result.text, '12.3');
    assert.equal(result.value, 12.3);
  });

  it('여러 소수점은 첫 번째만 유지한다', () => {
    const result = parseSafeNumericInput('1.2.3.4', { decimalScale: 2 });
    assert.equal(result.text, '1.23');
    assert.equal(result.value, 1.23);
  });

  it('숫자 입력값도 decimalScale에 맞게 정규화한다', () => {
    const result = parseSafeNumericInput(12.345, { decimalScale: 1 });
    assert.equal(result.text, '12.3');
    assert.equal(result.value, 12.3);
  });

  it('maxDigits로 정수부 길이를 제한한다', () => {
    const result = parseSafeNumericInput('1234.5', { decimalScale: 1, maxDigits: 2 });
    assert.equal(result.text, '12.5');
    assert.equal(result.value, 12.5);
  });
});
