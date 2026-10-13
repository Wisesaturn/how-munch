/** 빌드 대상. 값을 늘리려면 여기에 더한다 */
export const BUILD_TARGETS = ['web', 'ait'] as const;
export type BuildTarget = (typeof BUILD_TARGETS)[number];

/**
 * 이번 빌드가 어디에 낼 빌드인지. 값이 없으면 web으로 본다.
 * 빌드 시점에 인라인되도록 process.env.NEXT_PUBLIC_BUILD_TARGET을 그대로 적어 읽는다(구조 분해 금지).
 * 허용하지 않는 값은 next.config.ts에서 빌드를 멈춘다
 */
export const BUILD_TARGET = (process.env.NEXT_PUBLIC_BUILD_TARGET ?? 'web') as BuildTarget;

/** 앱인토스(.ait) 번들 빌드 여부 */
export const IS_AIT_BUILD = BUILD_TARGET === 'ait';
