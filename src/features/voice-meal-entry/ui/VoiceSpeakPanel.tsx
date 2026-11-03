'use client';

import { useRef, useState } from 'react';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Keyboard, Mic, MicOff, X } from 'lucide-react';

import { cn } from '@/commons/lib';
import { Textarea } from '@/commons/ui';

import {
  type TranscriptionFailure,
  useMicrophoneLevel,
  type useRealtimeTranscription,
} from '../model';

/* -------------------------------------------------------------------------------------------------
 * Constants
 * -----------------------------------------------------------------------------------------------*/

const FAILURE_MESSAGE: Record<TranscriptionFailure, string> = {
  'permission-denied': '마이크 권한이 없어 말로는 기록할 수 없어요. 글로 적어 주세요',
  unavailable: '이 기기에서는 마이크를 쓸 수 없어요. 글로 적어 주세요',
  'no-speech': '말소리를 듣지 못했어요. 마이크를 눌러 다시 말해 주세요',
  'connection-failed': '음성 인식에 연결하지 못했어요. 잠시 뒤 마이크를 다시 눌러 주세요',
};

/** 마이크 한쪽에 놓는 게이지 막대 수. 양옆에 같은 수를 거울처럼 둔다 */
const BAR_COUNT = 5;
/** 조용할 때도 막대가 점으로 남도록 두는 최소 높이 비율 */
const BAR_REST_SCALE = 0.14;
/** iOS 기본 움직임에 가까운 스프링 */
const SPRING = { type: 'spring', stiffness: 380, damping: 30, mass: 0.8 } as const;

/* -------------------------------------------------------------------------------------------------
 * VoiceSpeakPanel
 * -----------------------------------------------------------------------------------------------*/

interface VoiceSpeakPanelProps {
  text: string;
  onTextChange: (text: string) => void;
  transcription: ReturnType<typeof useRealtimeTranscription>;
  /** 정리 API를 부르는 중. 게이지가 물결로 바뀐다 */
  isOrganizing: boolean;
  onClose: () => void;
}

/**
 * 말하기 시트 안쪽 — 안내, 받아쓴 글, 큰 마이크와 양옆 음량 게이지.
 * 받아쓴 글은 단어가 들어올 때마다 부드럽게 나타나고, 게이지는 마이크 입력 세기에 맞춰 움직인다.
 * 권한이 없거나 직접 고치고 싶으면 글 입력칸으로 바꿔 적을 수 있다.
 */
export function VoiceSpeakPanel({
  text,
  onTextChange,
  transcription,
  isOrganizing,
  onClose,
}: VoiceSpeakPanelProps) {
  const prefersReducedMotion = useReducedMotion();

  const isListening = transcription.status === 'listening';
  const isConnecting = transcription.status === 'connecting';
  const failure = transcription.failure ?? (transcription.isSupported ? null : 'unavailable');
  const isMicrophoneBlocked = failure === 'permission-denied' || failure === 'unavailable';
  const [isTyping, setIsTyping] = useState(false);
  const showTextInput = isTyping || isMicrophoneBlocked;

  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const glowRef = useRef<HTMLSpanElement>(null);

  useMicrophoneLevel({
    active: isListening,
    bandCount: BAR_COUNT,
    onFrame(bands) {
      bands.forEach((level, index) => {
        const scale = BAR_REST_SCALE + (1 - BAR_REST_SCALE) * level;
        // 왼쪽 막대는 거울처럼 뒤집어, 낮은 소리 묶음이 마이크 가까이에 오게 한다
        const left = barRefs.current[BAR_COUNT - 1 - index];
        const right = barRefs.current[BAR_COUNT + index];
        if (left) left.style.transform = `scaleY(${scale})`;
        if (right) right.style.transform = `scaleY(${scale})`;
      });
      if (glowRef.current && !prefersReducedMotion) {
        const loudest = Math.max(...bands);
        glowRef.current.style.transform = `scale(${1 + loudest * 0.45})`;
      }
    },
  });

  function toggleMicrophone() {
    if (transcription.status === 'idle') {
      setIsTyping(false);
      void transcription.start(text);
      return;
    }
    transcription.stop();
  }

  function startTyping() {
    transcription.stop();
    setIsTyping(true);
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex w-full justify-end">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="-mt-2 -mr-2 flex size-11 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 active:bg-gray-100"
        >
          <X className="size-6" aria-hidden />
        </button>
      </div>

      <h2 className="w-full text-[22px] leading-8 font-semibold break-keep text-gray-900">
        소비한 재료를 말해주세요
      </h2>
      <VoiceStatus
        failure={failure}
        isConnecting={isConnecting}
        isListening={isListening}
        isOrganizing={isOrganizing}
        hasText={text.trim().length > 0}
      />

      <div className="mt-5 flex min-h-24 w-full items-start justify-center">
        {showTextInput ? (
          <Textarea
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            placeholder="예: 양파 반 개랑 돼지고기 200g 썼어"
            aria-label="소비한 재료"
            rows={3}
            autoFocus={isTyping}
            className="w-full text-left text-[17px] leading-7 break-keep"
          />
        ) : (
          <LiveTranscript text={text} />
        )}
      </div>

      <div className="mt-4 flex w-full items-center justify-center gap-5">
        <EqualizerBars
          side="left"
          barRefs={barRefs}
          isActive={isListening}
          isWaving={isOrganizing}
        />
        <div className="relative flex size-24 shrink-0 items-center justify-center">
          <span
            ref={glowRef}
            aria-hidden
            className={cn(
              'absolute inset-0 rounded-full bg-emerald-400/50 blur-md transition-[opacity,transform] duration-150 ease-out',
              isListening ? 'opacity-70' : 'opacity-0',
              isConnecting && 'opacity-60 motion-safe:animate-pulse',
            )}
          />
          <motion.button
            type="button"
            onClick={toggleMicrophone}
            disabled={isMicrophoneBlocked || isConnecting || isOrganizing}
            aria-pressed={isListening}
            aria-label={isListening ? '말하기 멈추기' : '말하기 시작'}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
            animate={prefersReducedMotion ? undefined : { scale: isListening ? 1.06 : 1 }}
            transition={SPRING}
            className={cn(
              'relative flex size-20 items-center justify-center rounded-full transition-[background-color,box-shadow,color] duration-300',
              'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
              (isListening || isConnecting) &&
                'bg-emerald-600 text-white shadow-[0_8px_24px_rgba(5,150,105,0.4)] ring-0',
              isMicrophoneBlocked && 'bg-gray-100 text-gray-400 shadow-none ring-1 ring-gray-200',
            )}
          >
            {isMicrophoneBlocked ? (
              <MicOff className="size-8" aria-hidden />
            ) : (
              <Mic className="size-8" aria-hidden />
            )}
          </motion.button>
        </div>
        <EqualizerBars
          side="right"
          barRefs={barRefs}
          isActive={isListening}
          isWaving={isOrganizing}
        />
      </div>

      {!showTextInput && (
        <button
          type="button"
          onClick={startTyping}
          disabled={isOrganizing}
          className="mt-3 flex h-11 items-center gap-1.5 rounded-full px-4 text-[15px] text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-100 disabled:opacity-50"
        >
          <Keyboard className="size-5" aria-hidden />
          글로 적기
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * LiveTranscript
 * -----------------------------------------------------------------------------------------------*/

/** 받아쓴 글을 단어마다 나눠, 새로 들어온 단어가 흐림에서 또렷하게 나타나게 한다 */
function LiveTranscript({ text }: { text: string }) {
  const prefersReducedMotion = useReducedMotion();
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return (
      <p className="w-full text-[20px] leading-8 break-keep text-gray-400">
        예: 양파 반 개랑 돼지고기 200g 썼어
      </p>
    );
  }

  return (
    <p aria-live="polite" className="w-full text-[20px] leading-8 break-keep text-gray-900">
      {words.map((word, index) => (
        <motion.span
          // 앞 단어는 그대로 두고 뒤에 붙은 단어만 새로 나타나게 위치를 키로 쓴다

          key={`${index}-${word}`}
          initial={prefersReducedMotion ? false : { opacity: 0, filter: 'blur(6px)', y: 4 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="inline-block"
        >
          {word}
          {index < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </p>
  );
}

/* -------------------------------------------------------------------------------------------------
 * EqualizerBars
 * -----------------------------------------------------------------------------------------------*/

interface EqualizerBarsProps {
  side: 'left' | 'right';
  barRefs: React.RefObject<(HTMLSpanElement | null)[]>;
  isActive: boolean;
  /** 정리하는 동안 막대가 물결처럼 오르내린다 */
  isWaving: boolean;
}

/** 마이크 한쪽의 세로 막대들. 듣는 동안 높이는 useMicrophoneLevel이 DOM에 바로 쓴다 */
function EqualizerBars({ side, barRefs, isActive, isWaving }: EqualizerBarsProps) {
  const offset = side === 'left' ? 0 : BAR_COUNT;
  const prefersReducedMotion = useReducedMotion();

  return (
    <div aria-hidden className="flex h-14 items-center gap-[5px]">
      {Array.from({ length: BAR_COUNT }, (_, index) => {
        const distance = side === 'left' ? BAR_COUNT - 1 - index : index;
        return isWaving && !prefersReducedMotion ? (
          <motion.span
            key={`wave-${index}`}
            className="h-14 w-[5px] origin-center rounded-full bg-emerald-400"
            initial={{ scaleY: BAR_REST_SCALE }}
            animate={{ scaleY: [BAR_REST_SCALE, 0.55, BAR_REST_SCALE] }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              delay: distance * 0.09,
              ease: 'easeInOut',
            }}
          />
        ) : (
          <span
            key={`bar-${index}`}
            ref={(element) => {
              barRefs.current[offset + index] = element;
            }}
            style={{ transform: `scaleY(${BAR_REST_SCALE})` }}
            className={cn(
              'h-14 w-[5px] origin-center rounded-full transition-[background-color,transform] duration-100 ease-out',
              isActive ? 'bg-emerald-500' : 'bg-gray-300',
            )}
          />
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * VoiceStatus
 * -----------------------------------------------------------------------------------------------*/

interface VoiceStatusProps {
  failure: TranscriptionFailure | null;
  isConnecting: boolean;
  isListening: boolean;
  isOrganizing: boolean;
  hasText: boolean;
}

/** 상태 문구가 바뀔 때 위아래로 살짝 밀리며 바뀐다 */
function VoiceStatus(props: VoiceStatusProps) {
  const prefersReducedMotion = useReducedMotion();
  const isFailure = props.failure !== null && !props.isOrganizing;
  const message = isFailure ? FAILURE_MESSAGE[props.failure!] : getStatusMessage(props);

  return (
    <div className="mt-2 flex min-h-7 w-full items-start justify-center overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={message}
          role={isFailure ? 'alert' : undefined}
          aria-live={isFailure ? undefined : 'polite'}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={cn(
            'text-[15px] leading-relaxed break-keep',
            isFailure && 'text-red-600',
            !isFailure && props.isListening && 'text-emerald-700',
            !isFailure && !props.isListening && 'text-gray-500',
          )}
        >
          {message}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function getStatusMessage({ isConnecting, isListening, isOrganizing, hasText }: VoiceStatusProps) {
  if (isOrganizing) return '말한 내용을 식단, 재고, 식비로 나누는 중이에요';
  if (isConnecting) return '마이크를 켜는 중이에요';
  if (isListening) return '듣고 있어요';
  if (hasText) return '다 말했으면 정리하기를 눌러 주세요';
  return '마이크를 누르고 말해 주세요';
}
