'use client';

import { type ReactNode, useRef } from 'react';

import {
  animate,
  motion,
  type PanInfo,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';

import { cn } from '../lib';

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

export interface SwipeActionItem {
  id: string;
  /** 버튼 레이블 */
  label: string;
  /** 버튼 아이콘 */
  icon: ReactNode;
  /** 버튼 배경색 (Tailwind 클래스) */
  className: string;
  /** 버튼 클릭 핸들러 */
  onPress: () => void;
}

interface SwipeActionProps {
  children: ReactNode;
  /** 스와이프 시 노출할 액션 목록 (왼→오 순서로 배치) */
  actions: SwipeActionItem[];
  /**
   * 액션 패널 너비 (px)
   * @default 120
   */
  actionsWidth?: number;
  className?: string;
}

/* -------------------------------------------------------------------------------------------------
 * SwipeAction
 * -----------------------------------------------------------------------------------------------*/

/**
 * @description iOS 스타일 스와이프 액션 컴포넌트.
 * motion.dev 스와이프 액션 튜토리얼 패턴 기반:
 * - `useMotionValue` — 드래그 x 위치 추적
 * - `useSpring` — 액션 패널 등장 애니메이션을 부드럽게
 * - `useTransform` — x 값 → opacity / scale 파생
 * - `animate` — 스냅 위치로 프로그래매틱 이동
 *
 * 빠른 스와이프(velocity < -400)는 첫 번째 액션을 즉시 실행하고 닫힘.
 */
export function SwipeAction({
  children,
  actions,
  actionsWidth = 120,
  className,
}: SwipeActionProps) {
  const x = useMotionValue(0);
  // xSpring: x를 부드럽게 추적해 액션 패널 애니메이션에 사용
  const xSpring = useSpring(x, { bounce: 0, duration: 250 });
  const isRevealedRef = useRef(false);

  // x → 액션 패널 opacity: 완전히 열리면 1, 닫히면 0
  const actionsOpacity = useTransform(xSpring, [-actionsWidth, -actionsWidth * 0.25, 0], [1, 1, 0]);
  // x → 액션 버튼 scale: 등장 시 살짝 커지는 pop 효과
  const actionsScale = useTransform(
    xSpring,
    [-actionsWidth, -actionsWidth * 0.5, 0],
    [1, 0.9, 0.7],
  );

  function snapTo(toX: number) {
    animate(x, toX, { type: 'spring', bounce: 0, duration: 0.3 });
    isRevealedRef.current = toX < 0;
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const isFastFullSwipe = info.velocity.x < -450 && info.offset.x < -(actionsWidth * 0.2);

    if (isFastFullSwipe) {
      // 빠른 스와이프 → 첫 번째 액션 즉시 실행
      animate(x, 0, { type: 'spring', bounce: 0 });
      isRevealedRef.current = false;
      actions[0]?.onPress();
      return;
    }

    // 35% 이상 열렸으면 스냅 오픈, 미만이면 닫기
    snapTo(info.offset.x < -(actionsWidth * 0.35) ? -actionsWidth : 0);
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* 스와이프 시 노출되는 액션 패널 */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-stretch"
        style={{ width: actionsWidth, opacity: actionsOpacity, scale: actionsScale }}
        aria-hidden
      >
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => {
              snapTo(0);
              action.onPress();
            }}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 transition-opacity active:opacity-70',
              action.className,
            )}
          >
            {action.icon}
            <span className="text-[11px] font-medium text-white">{action.label}</span>
          </button>
        ))}
      </motion.div>

      {/* 스와이프 가능한 메인 콘텐츠 */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -actionsWidth, right: 0 }}
        dragElastic={{ left: 0.12, right: 0 }}
        dragMomentum={false}
        style={{ x }}
        onDragEnd={handleDragEnd}
        onClick={(e) => {
          if (isRevealedRef.current) {
            e.stopPropagation();
            snapTo(0);
          }
        }}
        className="relative z-10 select-none"
      >
        {children}
      </motion.div>
    </div>
  );
}
