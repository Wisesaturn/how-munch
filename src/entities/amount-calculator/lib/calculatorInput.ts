import { type ExpressionOperator, type ExpressionToken } from './expression';

export type CalculatorKey =
  | { type: 'digits'; digits: string }
  | { type: 'operator'; operator: ExpressionOperator }
  | { type: 'percent' }
  | { type: 'backspace' }
  | { type: 'clear' };

export interface CalculatorInput {
  tokens: ExpressionToken[];
  /** 기존 금액이 채워진 직후인지 여부 — 이때 숫자를 누르면 새로 입력한다 */
  isReplaceable: boolean;
}

/** 숫자 하나의 최대 자리수 */
const MAX_DIGITS = 12;

function stripLeadingZeros(digits: string) {
  return digits.replace(/^0+(?=\d)/, '');
}

function appendDigits(input: CalculatorInput, digits: string): CalculatorInput {
  const tokens = input.isReplaceable ? [] : input.tokens;
  const last = tokens[tokens.length - 1];

  if (last?.type !== 'number') {
    return {
      tokens: [...tokens, { type: 'number', digits: stripLeadingZeros(digits), percent: false }],
      isReplaceable: false,
    };
  }

  // 10%에 숫자를 이어 붙이면 의미가 모호해서 입력을 받지 않는다
  if (last.percent) return input;

  const nextDigits = stripLeadingZeros(last.digits + digits);
  if (nextDigits.length > MAX_DIGITS) return input;

  return {
    tokens: [...tokens.slice(0, -1), { ...last, digits: nextDigits }],
    isReplaceable: false,
  };
}

function applyOperator(input: CalculatorInput, operator: ExpressionOperator): CalculatorInput {
  const { tokens } = input;
  const last = tokens[tokens.length - 1];
  if (!last) return input;

  const base = last.type === 'operator' ? tokens.slice(0, -1) : tokens;
  return { tokens: [...base, { type: 'operator', operator }], isReplaceable: false };
}

function applyPercent(input: CalculatorInput): CalculatorInput {
  const { tokens } = input;
  const last = tokens[tokens.length - 1];
  if (last?.type !== 'number' || last.percent) return input;

  return { tokens: [...tokens.slice(0, -1), { ...last, percent: true }], isReplaceable: false };
}

function deleteLast(input: CalculatorInput): CalculatorInput {
  const { tokens } = input;
  const last = tokens[tokens.length - 1];
  if (!last) return input;

  const rest = tokens.slice(0, -1);
  if (last.type === 'operator') return { tokens: rest, isReplaceable: false };
  if (last.percent) return { tokens: [...rest, { ...last, percent: false }], isReplaceable: false };
  if (last.digits.length === 1) return { tokens: rest, isReplaceable: false };

  return {
    tokens: [...rest, { ...last, digits: last.digits.slice(0, -1) }],
    isReplaceable: false,
  };
}

/**
 * @description 기존 금액으로 계산기 입력 상태를 만듭니다. null이면 빈 상태로 시작합니다.
 */
export function createCalculatorInput(amount: number | null): CalculatorInput {
  if (amount === null) return { tokens: [], isReplaceable: false };

  return {
    tokens: [{ type: 'number', digits: String(amount), percent: false }],
    isReplaceable: true,
  };
}

/**
 * @description 키 입력 하나를 반영한 다음 입력 상태를 돌려줍니다.
 * 키패드와 키보드가 같은 규칙을 쓰도록 입력 해석을 이 함수로 모읍니다.
 */
export function applyCalculatorKey(input: CalculatorInput, key: CalculatorKey): CalculatorInput {
  switch (key.type) {
    case 'digits':
      return appendDigits(input, key.digits);
    case 'operator':
      return applyOperator(input, key.operator);
    case 'percent':
      return applyPercent(input);
    case 'backspace':
      return deleteLast(input);
    case 'clear':
      return createCalculatorInput(null);
  }
}
