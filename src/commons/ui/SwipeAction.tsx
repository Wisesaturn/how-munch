'use client';

import { type ReactNode, useEffect, useRef } from 'react';

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
 * Group registry — 같은 groupId 내 하나만 열림
 * -----------------------------------------------------------------------------------------------*/

// groupId → (instanceId → close 콜백) 맵
const groupRegistry = new Map<string, Map<symbol, () => void>>();

function registerGroupMember(groupId: string, id: symbol, close: () => void): () => void {
  if (!groupRegistry.has(groupId)) groupRegistry.set(groupId, new Map());
  groupRegistry.get(groupId)!.set(id, close);
  return () => groupRegistry.get(groupId)?.delete(id);
}

function closeOthersInGroup(groupId: string, excludeId: symbol) {
  groupRegistry.get(groupId)?.forEach((close, id) => {
    if (id !== excludeId) close();
  });
}

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

export interface SwipeActionItem {
  id: string;
  /** 버튼 레이블 (생략 시 아이콘만 표시) */
  label?: string;
  /** 버튼 아이콘 (생략 시 레이블만 표시) */
  icon?: ReactNode;
  /** 버튼 배경색 (Tailwind 클래스) */
  className: string;
  /** 버튼 클릭 핸들러 */
  onPress: () => void;
}

interface SwipeActionProps {
  children: ReactNode;
  /** 오른쪽에서 등장하는 액션 (왼쪽으로 스와이프) */
  rightActions?: SwipeActionItem[];
  /** 왼쪽에서 등장하는 액션 (오른쪽으로 스와이프) */
  leftActions?: SwipeActionItem[];
  /**
   * 오른쪽 액션 패널 너비 (px)
   * @default 120
   */
  actionsWidth?: number;
  /**
   * 왼쪽 액션 패널 너비 (px)
   * @default 120
   */
  leftActionsWidth?: number;
  /**
   * 동일 그룹 내 하나만 열림 — 같은 groupId를 가진 다른 항목은 자동으로 닫힘
   */
  groupId?: string;
  className?: string;
}

/* -------------------------------------------------------------------------------------------------
 * SwipeAction
 * -----------------------------------------------------------------------------------------------*/

/**
 * @description iOS 스타일 스와이프 액션 컴포넌트.
 * - 왼쪽 스와이프 → 오른쪽 패널 노출 (rightActions)
 * - 오른쪽 스와이프 → 왼쪽 패널 노출 (leftActions)
 * - 빠른 스와이프(|velocity| > 450)는 첫 번째 액션을 즉시 실행하고 닫힘
 * - groupId를 지정하면 같은 그룹 내 다른 항목이 열릴 때 자동으로 닫힘
 */
export function SwipeAction({
  children,
  rightActions: actions = [],
  leftActions = [],
  actionsWidth = 120,
  leftActionsWidth = 120,
  groupId,
  className,
}: SwipeActionProps) {
  const hasRight = actions.length > 0;
  const hasLeft = leftActions.length > 0;

  const x = useMotionValue(0);
  const xSpring = useSpring(x, { bounce: 0, duration: 250 });
  // null = 닫힘, 'right' = 오른쪽 패널 열림, 'left' = 왼쪽 패널 열림
  const revealedRef = useRef<'right' | 'left' | null>(null);
  // 드래그 직후 발생하는 spurious click 억제용
  const justDraggedRef = useRef(false);
  // 그룹 레지스트리에서 이 인스턴스를 식별하는 고유 심볼
  const instanceId = useRef(Symbol());

  const rightOpacity = useTransform(xSpring, [-actionsWidth, -actionsWidth * 0.25, 0], [1, 1, 0]);
  const leftOpacity = useTransform(
    xSpring,
    [0, leftActionsWidth * 0.25, leftActionsWidth],
    [0, 1, 1],
  );

  useEffect(
    function registerInGroup() {
      if (!groupId) return;
      return registerGroupMember(groupId, instanceId.current, () => {
        animate(x, 0, { type: 'spring', bounce: 0, duration: 0.3 });
        revealedRef.current = null;
      });
    },
    [groupId, x],
  );

  function snapTo(toX: number) {
    animate(x, toX, { type: 'spring', bounce: 0, duration: 0.3 });
    if (toX < 0) {
      revealedRef.current = 'right';
      if (groupId) closeOthersInGroup(groupId, instanceId.current);
    } else if (toX > 0) {
      revealedRef.current = 'left';
      if (groupId) closeOthersInGroup(groupId, instanceId.current);
    } else {
      revealedRef.current = null;
    }
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    // 의미 있는 드래그가 있었으면 직후 click 억제 (pointerup → click 순서)
    if (Math.abs(info.offset.x) > 3) {
      justDraggedRef.current = true;
      window.setTimeout(() => {
        justDraggedRef.current = false;
      }, 50);
    }

    const isFastLeft = info.velocity.x < -450 && info.offset.x < -(actionsWidth * 0.2);
    const isFastRight = info.velocity.x > 450 && info.offset.x > leftActionsWidth * 0.2;

    if (isFastLeft && hasRight) {
      animate(x, 0, { type: 'spring', bounce: 0 });
      revealedRef.current = null;
      actions[0]?.onPress();
      return;
    }

    if (isFastRight && hasLeft) {
      animate(x, 0, { type: 'spring', bounce: 0 });
      revealedRef.current = null;
      leftActions[0]?.onPress();
      return;
    }

    if (info.offset.x < -(actionsWidth * 0.35) && hasRight) {
      snapTo(-actionsWidth);
    } else if (info.offset.x > leftActionsWidth * 0.35 && hasLeft) {
      snapTo(leftActionsWidth);
    } else {
      snapTo(0);
    }
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* 오른쪽 액션 패널 — 왼쪽 스와이프로 노출 */}
      {hasRight && (
        <motion.div
          className="absolute inset-y-0 right-0 flex items-stretch"
          style={{ width: actionsWidth, opacity: rightOpacity }}
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
              {action.icon && <span className="text-white">{action.icon}</span>}
              {action.label && (
                <span className="text-[11px] font-medium text-white">{action.label}</span>
              )}
            </button>
          ))}
        </motion.div>
      )}

      {/* 왼쪽 액션 패널 — 오른쪽 스와이프로 노출 */}
      {hasLeft && (
        <motion.div
          className="absolute inset-y-0 left-0 flex items-stretch"
          style={{ width: leftActionsWidth, opacity: leftOpacity }}
          aria-hidden
        >
          {leftActions.map((action) => (
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
              {action.icon && <span className="text-white">{action.icon}</span>}
              {action.label && (
                <span className="text-[11px] font-medium text-white">{action.label}</span>
              )}
            </button>
          ))}
        </motion.div>
      )}

      {/* 스와이프 가능한 메인 콘텐츠 */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{
          left: hasRight ? -actionsWidth : 0,
          right: hasLeft ? leftActionsWidth : 0,
        }}
        dragElastic={{
          left: hasRight ? 0.12 : 0,
          right: hasLeft ? 0.12 : 0,
        }}
        dragMomentum={false}
        style={{ x }}
        onDragEnd={handleDragEnd}
        onClickCapture={(e) => {
          if (justDraggedRef.current) {
            e.stopPropagation();
            e.preventDefault();
            return;
          }
          if (revealedRef.current !== null) {
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
