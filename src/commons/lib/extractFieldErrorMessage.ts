interface ExtractFieldErrorMessageOptions {
  /** 우선순위 필드만 검사합니다 */
  onlyPriority?: boolean;
}

/**
 * @description 단일 값(문자열/Error/배열/객체)에서 첫 번째 유효 에러 메시지를 재귀적으로 추출합니다.
 */
function extractMessageFromValue(value: unknown): string | undefined {
  if (!value) return undefined;

  if (typeof value === 'string') {
    return value.trim() || undefined;
  }

  if (value instanceof Error) {
    return value.message.trim() || undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = extractMessageFromValue(item);
      if (message) return message;
    }
    return undefined;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if ('message' in record && typeof record.message === 'string') {
      return record.message.trim() || undefined;
    }

    for (const nestedValue of Object.values(record)) {
      const message = extractMessageFromValue(nestedValue);
      if (message) return message;
    }
  }

  return undefined;
}

/**
 * @description 다양한 폼 에러 객체/배열에서 사용자에게 노출할 첫 번째 메시지를 우선순위 규칙에 따라 추출합니다.
 */
function extractFieldErrorMessage<T extends Record<string, unknown>>(
  errors: unknown,
  priorityFields: (keyof T)[] = [],
  options: ExtractFieldErrorMessageOptions = {},
): string | undefined {
  if (!errors) return undefined;

  if (typeof errors !== 'object' || Array.isArray(errors)) {
    return extractMessageFromValue(errors);
  }

  const record = errors as Record<string, unknown>;
  const { onlyPriority = false } = options;

  const fields = onlyPriority
    ? priorityFields.map((field) => String(field))
    : [
        ...priorityFields.map((field) => String(field)),
        ...Object.keys(record).filter((key) => !priorityFields.includes(key as keyof T)),
      ];

  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(record, field)) continue;
    const message = extractMessageFromValue(record[field]);
    if (message) return message;
  }

  return undefined;
}

export { extractFieldErrorMessage };
