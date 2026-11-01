export type ExpressionOperator = '+' | '−' | '×' | '÷';

export interface ExpressionNumberToken {
  type: 'number';
  /** 입력한 숫자 문자열 (쉼표 없음) */
  digits: string;
  /** 뒤에 %가 붙었는지 여부 */
  percent: boolean;
}

export interface ExpressionOperatorToken {
  type: 'operator';
  operator: ExpressionOperator;
}

export type ExpressionToken = ExpressionNumberToken | ExpressionOperatorToken;

export type ExpressionResult =
  | { status: 'empty' }
  | { status: 'divideByZero' }
  | { status: 'negative'; value: number }
  | { status: 'tooLarge'; value: number }
  | { status: 'ok'; value: number; rounded: boolean };

/** 화면이 깨지지 않게 막는 계산 상한 — 금액의 업무 상한은 각 폼 스키마가 맡는다 */
const MAX_EXPRESSION_RESULT = 999_999_999_999;
/** 부동소수 오차를 걷어낼 소수 자리수 */
const FLOAT_PRECISION = 6;

interface ExpressionTerm {
  operator: '+' | '−';
  value: number;
  /** 곱셈·나눗셈 없이 %만 있는 항 — 덧셈·뺄셈에서 앞선 합계의 비율로 계산한다 */
  isPlainPercent: boolean;
}

function resolveOperand(token: ExpressionNumberToken) {
  return Number(token.digits) / (token.percent ? 100 : 1);
}

function stripTrailingOperator(tokens: ExpressionToken[]) {
  return tokens[tokens.length - 1]?.type === 'operator' ? tokens.slice(0, -1) : tokens;
}

/**
 * @description 토큰을 덧셈·뺄셈 단위 항으로 묶으며 곱셈·나눗셈을 먼저 계산합니다.
 * @returns 항 목록. 0으로 나누면 null을 반환합니다.
 */
function collectTerms(tokens: ExpressionToken[]): ExpressionTerm[] | null {
  const terms: ExpressionTerm[] = [];
  let current: ExpressionTerm | null = null;
  let pendingOperator: ExpressionOperator | null = null;

  for (const token of tokens) {
    if (token.type === 'operator') {
      pendingOperator = token.operator;
      continue;
    }

    const operand = resolveOperand(token);

    if (current && (pendingOperator === '×' || pendingOperator === '÷')) {
      if (pendingOperator === '÷' && operand === 0) return null;
      current.value = pendingOperator === '×' ? current.value * operand : current.value / operand;
      current.isPlainPercent = false;
      continue;
    }

    current = {
      operator: pendingOperator === '−' ? '−' : '+',
      value: operand,
      isPlainPercent: token.percent,
    };
    terms.push(current);
  }

  return terms;
}

/**
 * @description 수식 토큰을 iOS 계산기 규칙으로 계산해 원 단위 금액으로 돌려줍니다.
 * 곱셈·나눗셈을 먼저 계산하고, 덧셈·뺄셈의 % 항은 앞선 합계의 비율로 계산합니다.
 * 끝에 남은 연산자는 무시하고, 반올림은 최종 결과에서 한 번만 합니다.
 * @example 12,000 + 3,500 × 2 // { status: 'ok', value: 19000, rounded: false }
 * @example 48,000 − 10% // { status: 'ok', value: 43200, rounded: false }
 */
export function evaluateExpression(tokens: ExpressionToken[]): ExpressionResult {
  const usableTokens = stripTrailingOperator(tokens);
  if (usableTokens.length === 0) return { status: 'empty' };

  const terms = collectTerms(usableTokens);
  if (!terms) return { status: 'divideByZero' };

  const total = terms.slice(1).reduce((sum, term) => {
    const delta = term.isPlainPercent ? sum * term.value : term.value;
    return term.operator === '+' ? sum + delta : sum - delta;
  }, terms[0].value);

  const precise = Number(total.toFixed(FLOAT_PRECISION));
  // Math.round(-0.4)는 -0이라 0으로 맞춘다
  const value = Math.round(precise) + 0;

  if (value < 0) return { status: 'negative', value };
  if (value > MAX_EXPRESSION_RESULT) return { status: 'tooLarge', value };
  return { status: 'ok', value, rounded: precise !== value };
}

/**
 * @description 수식 토큰을 화면 표시용 문자열로 변환합니다.
 * @example '12,000 + 3,500 × 2'
 */
export function formatExpression(tokens: ExpressionToken[]) {
  return tokens
    .map((token) =>
      token.type === 'operator'
        ? token.operator
        : `${Number(token.digits).toLocaleString('ko-KR')}${token.percent ? '%' : ''}`,
    )
    .join(' ');
}
