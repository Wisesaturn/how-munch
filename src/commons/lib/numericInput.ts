import { clamp } from 'es-toolkit';

interface ParseSafeNumericInputOptions {
  /** 소수점 허용 자리수(0이면 정수만 허용) */
  decimalScale?: number;
  /** 정수부 최대 자리수 */
  maxDigits?: number;
  /** 음수 입력 허용 여부 */
  allowNegative?: boolean;
}

interface ParseSafeNumericInputResult {
  /** 입력 필드에 유지할 안전한 문자열 값 */
  text: string;
  /** 숫자로 확정 가능한 경우의 파싱 값(입력 중간 상태는 null) */
  value: number | null;
  /** 소수점으로 끝나는 입력 중간 상태 여부 (예: "12.") */
  hasTrailingDot: boolean;
}

/**
 * @description 문자열/숫자 입력을 숫자 입력 필드용 안전한 형태로 정규화합니다.
 * @param input 정규화할 원본 입력값(문자열 또는 숫자)
 * @param options 정규화 옵션
 * `decimalScale`: 소수점 허용 자리수(0이면 정수만 허용)
 * `maxDigits`: 정수부 최대 자리수
 * `allowNegative`: 음수 입력 허용 여부
 * @returns 입력 필드 표시값(text), 확정 숫자값(value), 소수점 입력 중 상태(hasTrailingDot)
 * @example parseSafeNumericInput('12.34', { decimalScale: 1 }).text // '12.3'
 * @example parseSafeNumericInput('12.', { decimalScale: 1 }).hasTrailingDot // true
 * @example parseSafeNumericInput('abc12.3', { decimalScale: 1 }).value // 12.3
 * @example parseSafeNumericInput(12.345, { decimalScale: 1 }).text // '12.3'
 */
export function parseSafeNumericInput(
  input: string | number,
  options: ParseSafeNumericInputOptions = {},
): ParseSafeNumericInputResult {
  const { decimalScale = 0, maxDigits, allowNegative = false } = options;

  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return { text: '0', value: 0, hasTrailingDot: false };

    const maxValue =
      typeof maxDigits === 'number' && maxDigits > 0 ? Math.pow(10, maxDigits) - 1 : undefined;
    const minValue = allowNegative && maxValue !== undefined ? -maxValue : 0;
    let clampedValue = allowNegative ? input : Math.max(0, input);
    if (typeof maxValue === 'number') {
      clampedValue = clamp(input, minValue, maxValue);
    }
    const normalizedValue =
      decimalScale > 0 ? Number(clampedValue.toFixed(decimalScale)) : Math.round(clampedValue);

    return {
      text:
        decimalScale > 0
          ? String(normalizedValue)
              .replace(/\.0+$/, '')
              .replace(/(\.\d*?)0+$/, '$1')
          : String(normalizedValue),
      value: normalizedValue,
      hasTrailingDot: false,
    };
  }

  if (input === '') return { text: '', value: null, hasTrailingDot: false };

  const trimmed = input.replace(/\s/g, '').replace(/,/g, '.');
  const withSign = allowNegative ? trimmed.replace(/(?!^-)-/g, '') : trimmed.replace(/-/g, '');
  const cleaned = withSign.replace(/[^0-9.-]/g, '');
  const normalizedCleaned = decimalScale <= 0 ? cleaned.replace(/\./g, '') : cleaned;
  const firstDotIndex = normalizedCleaned.indexOf('.');
  const hasDot = decimalScale > 0 && firstDotIndex >= 0;
  const hasTrailingDot = hasDot && normalizedCleaned.endsWith('.');

  let integerPart = hasDot ? normalizedCleaned.slice(0, firstDotIndex) : normalizedCleaned;
  let decimalPart = hasDot ? normalizedCleaned.slice(firstDotIndex + 1).replace(/\./g, '') : '';

  if (typeof maxDigits === 'number' && maxDigits > 0) {
    integerPart = integerPart.slice(0, maxDigits);
  }

  if (integerPart.length > 1 && integerPart.startsWith('0')) {
    integerPart = integerPart.replace(/^0+/, '') || '0';
  }

  if (decimalScale <= 0) {
    decimalPart = '';
  } else {
    decimalPart = decimalPart.slice(0, decimalScale);
  }

  const unsignedIntegerPart = integerPart === '' ? '' : integerPart;
  const nextText = hasDot
    ? `${unsignedIntegerPart || '0'}.${decimalPart}`
    : (unsignedIntegerPart ?? '');

  if (
    nextText === '' ||
    nextText === '-' ||
    nextText === '.' ||
    nextText === '-.' ||
    hasTrailingDot
  ) {
    return {
      text: nextText,
      value: null,
      hasTrailingDot,
    };
  }

  const parsedValue = Number(nextText);
  if (!Number.isFinite(parsedValue)) {
    return {
      text: nextText,
      value: null,
      hasTrailingDot,
    };
  }

  return {
    text: nextText,
    value: parsedValue,
    hasTrailingDot: false,
  };
}
