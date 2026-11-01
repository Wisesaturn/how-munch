import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  applyCalculatorKey,
  createCalculatorInput,
  type CalculatorInput,
  type CalculatorKey,
} from './calculatorInput';
import { formatExpression } from './expression';

const digits = (value: string): CalculatorKey => ({ type: 'digits', digits: value });
const plus: CalculatorKey = { type: 'operator', operator: '+' };
const minus: CalculatorKey = { type: 'operator', operator: '−' };
const percent: CalculatorKey = { type: 'percent' };
const backspace: CalculatorKey = { type: 'backspace' };

function press(input: CalculatorInput, ...keys: CalculatorKey[]) {
  return formatExpression(keys.reduce(applyCalculatorKey, input).tokens);
}

const empty = createCalculatorInput(null);

describe('createCalculatorInput', () => {
  it('null은 빈 상태, 0은 0원으로 시작한다', () => {
    assert.equal(press(empty), '');
    assert.equal(press(createCalculatorInput(0)), '0');
  });
});

describe('applyCalculatorKey', () => {
  it('기존 금액에서 숫자를 누르면 새로 입력한다', () => {
    assert.equal(press(createCalculatorInput(12000), digits('5')), '5');
  });

  it('기존 금액에서 연산자를 누르면 이어서 계산한다', () => {
    assert.equal(press(createCalculatorInput(12000), plus, digits('5')), '12,000 + 5');
  });

  it('기존 금액에서 지우기를 누르면 한 자리만 지운다', () => {
    assert.equal(press(createCalculatorInput(12000), backspace), '1,200');
  });

  it('맨 앞의 0을 정리한다', () => {
    assert.equal(press(empty, digits('00')), '0');
    assert.equal(press(empty, digits('0'), digits('000')), '0');
    assert.equal(press(empty, digits('0'), digits('7')), '7');
    assert.equal(press(empty, digits('5'), digits('000')), '5,000');
  });

  it('숫자 없이 연산자를 누르면 무시하고, 연달아 누르면 교체한다', () => {
    assert.equal(press(empty, plus), '');
    assert.equal(press(empty, digits('5'), plus, minus), '5 −');
  });

  it('%가 붙은 숫자에는 숫자를 잇지 않고, 지우면 %부터 지운다', () => {
    assert.equal(press(empty, digits('10'), percent), '10%');
    assert.equal(press(empty, digits('10'), percent, digits('5')), '10%');
    assert.equal(press(empty, digits('10'), percent, backspace), '10');
  });

  it('12자리를 넘는 숫자는 받지 않는다', () => {
    assert.equal(press(empty, digits('123456789012'), digits('3')), '123,456,789,012');
  });

  it('모두 지우기는 빈 상태로 돌아간다', () => {
    assert.equal(press(createCalculatorInput(12000), { type: 'clear' }), '');
  });
});
