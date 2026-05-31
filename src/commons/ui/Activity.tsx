import { Activity as ReactActivity } from 'react';

/* -------------------------------------------------------------------------------------------------
 * Activity
 * -----------------------------------------------------------------------------------------------*/

interface ActivityProps {
  /**
   * 콘텐츠 표시 여부.
   * false → `mode="hidden"` (display:none, 상태 보존)
   * true  → `mode="visible"` (기본)
   */
  visible?: boolean;
  /**
   * React Activity `mode` 직접 지정.
   * `visible` prop과 함께 사용 시 `mode`가 우선함.
   */
  mode?: 'visible' | 'hidden';
  /** React DevTools 식별용 이름 */
  name?: string;
  children: React.ReactNode;
}

/**
 * @description React 19 `<Activity>` 래퍼.
 * 자식 컴포넌트를 언마운트하지 않고 `display:none`으로 숨겨 상태를 보존한다.
 *
 * `visible={false}`일 때 Effects는 정리되지만 컴포넌트 상태(스크롤 위치,
 * 입력값, 열림/닫힘 등)는 유지된다.
 *
 * 주요 사용 사례:
 * - 탭 전환 시 각 탭 콘텐츠의 스크롤 위치·입력 상태 보존
 * - Bottom Sheet를 overlay-kit 외부에서 hide/show할 때 내부 폼 상태 보존
 * - 숨겨진 콘텐츠 사전 렌더링 (Suspense 기반 데이터 패칭 포함)
 */
export function Activity({ visible, mode, name, children }: ActivityProps) {
  const resolvedMode: 'visible' | 'hidden' = mode ?? (visible === false ? 'hidden' : 'visible');

  return (
    <ReactActivity mode={resolvedMode} name={name}>
      {children}
    </ReactActivity>
  );
}
