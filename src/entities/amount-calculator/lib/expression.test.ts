import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateExpression,
  formatExpression,
  type ExpressionOperator,
  type ExpressionToken,
} from './expression';

function parse(text: string): ExpressionToken[] {
  return text.split(' ').map((part) => {
    if (['+', '−', '×', '÷'].includes(part)) {
      return { type: 'operator', operator: part as ExpressionOperator };
    }
    return { type: 'number', digits: part.replace(/[,%]/g, ''), percent: part.endsWith('%') };
  });
}

function ok(value: number, rounded = false) {
  return { status: 'ok', value, rounded };
}

describe('evaluateExpression', () => {
  it('곱셈·나눗셈을 먼저 계산한다', () => {
    assert.deepEqual(evaluateExpression(parse('12,000 + 3,500 × 2')), ok(19000));
  });

  it('덧셈·뺄셈의 %는 앞선 합계의 비율로 계산한다', () => {
    assert.deepEqual(evaluateExpression(parse('48,000 − 10%')), ok(43200));
    assert.deepEqual(evaluateExpression(parse('48,000 + 10%')), ok(52800));
  });

  it('곱셈의 %는 100으로 나눈 값으로 계산한다', () => {
    assert.deepEqual(evaluateExpression(parse('200 × 10%')), ok(20));
  });

  it('최종 결과만 원 단위로 반올림한다', () => {
    assert.deepEqual(evaluateExpression(parse('86,000 ÷ 3')), ok(28667, true));
    assert.deepEqual(evaluateExpression(parse('10,000 ÷ 3 × 3')), ok(10000));
  });

  it('부동소수 오차를 반올림으로 안내하지 않는다', () => {
    assert.deepEqual(evaluateExpression(parse('1,000 + 10%')), ok(1100));
  });

  it('끝에 남은 연산자는 무시한다', () => {
    assert.deepEqual(evaluateExpression(parse('100 +')), ok(100));
  });

  it('빈 수식, 0으로 나누기, 음수, 상한 초과를 구분한다', () => {
    assert.deepEqual(evaluateExpression([]), { status: 'empty' });
    assert.deepEqual(evaluateExpression(parse('5,000 ÷ 0')), { status: 'divideByZero' });
    assert.deepEqual(evaluateExpression(parse('3,000 − 4,500')), {
      status: 'negative',
      value: -1500,
    });
    assert.equal(evaluateExpression(parse('999,999,999,999 + 1')).status, 'tooLarge');
  });

  it('0으로 반올림되는 작은 음수는 0원으로 계산한다', () => {
    assert.deepEqual(evaluateExpression(parse('3 ÷ 10 − 7 ÷ 10')), ok(0, true));
  });
});

describe('formatExpression', () => {
  it('천 단위 쉼표와 %를 붙여 보여준다', () => {
    assert.equal(formatExpression(parse('12000 + 10%')), '12,000 + 10%');
  });
});
