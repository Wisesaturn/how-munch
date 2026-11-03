'use client';

import { useRef } from 'react';

import { useReducedMotion } from 'framer-motion';
import { Mic, MicOff, X } from 'lucide-react';

import { cn } from '@/commons/lib';

import {
  type TranscriptionFailure,
  useMicrophoneLevel,
  type useRealtimeTranscription,
} from '../model';

/* -------------------------------------------------------------------------------------------------
 * Constants
 * -----------------------------------------------------------------------------------------------*/

const FAILURE_MESSAGE: Record<TranscriptionFailure, string> = {
  'permission-denied': '마이크 권한이 없어 말로는 기록할 수 없어요. 아래 칸에 글로 적어 주세요',
  unavailable: '이 기기에서는 마이크를 쓸 수 없어요. 아래 칸에 글로 적어 주세요',
  'no-speech': '말소리를 듣지 못했어요. 마이크를 눌러 다시 말해 주세요',
  'connection-failed': '음성 인식에 연결하지 못했어요. 잠시 뒤 마이크를 다시 눌러 주세요',
};

/** 마이크 한쪽에 놓는 게이지 막대 수. 양옆에 같은 수를 거울처럼 둔다 */
const BAR_COUNT = 5;
/** 조용할 때도 막대가 점으로 남도록 두는 최소 높이 비율 */
const BAR_REST_SCALE = 0.14;

/* -------------------------------------------------------------------------------------------------
 * VoiceSpeakPanel
 * -----------------------------------------------------------------------------------------------*/

interface VoiceSpeakPanelProps {
  text: string;
  onTextChange: (text: string) => void;
  transcription: ReturnType<typeof useRealtimeTranscription>;
  onClose: () => void;
}

/**
 * 말하기 시트 안쪽 — 안내, 받아쓴 글, 큰 마이크와 양옆 음량 게이지.
 * 게이지는 마이크 입력 세기에 맞춰 움직이고, 권한이 없으면 꺼진 마이크와 글로 적는 길을 안내한다.
 */
export function VoiceSpeakPanel({
  text,
  onTextChange,
  transcription,
  onClose,
}: VoiceSpeakPanelProps) {
  const prefersReducedMotion = useReducedMotion();

  const isListening = transcription.status === 'listening';
  const isConnecting = transcription.status === 'connecting';
  const failure = transcription.failure ?? (transcription.isSupported ? null : 'unavailable');
  const isMicrophoneBlocked = failure === 'permission-denied' || failure === 'unavailable';

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
      void transcription.start(text);
      return;
    }
    transcription.stop();
  }

  return (
    <div className="flex flex-col">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="-mt-2 -mr-2 flex size-11 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 active:bg-gray-100"
        >
          <X className="size-6" aria-hidden />
        </button>
      </div>

      <h2 className="text-center text-[22px] leading-8 font-semibold break-keep text-gray-900">
        소비한 재료를 말해주세요
      </h2>
      <VoiceStatus
        failure={failure}
        isConnecting={isConnecting}
        isListening={isListening}
        hasText={text.length > 0}
      />

      <textarea
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        readOnly={isListening || isConnecting}
        placeholder="예: 양파 반 개랑 돼지고기 200g 썼어"
        aria-label="소비한 재료"
        rows={3}
        className="mt-5 w-full resize-none bg-transparent text-center text-[20px] leading-8 break-keep text-gray-900 caret-emerald-600 outline-none placeholder:text-gray-400"
      />

      <div className="mt-4 flex items-center justify-center gap-5">
        <EqualizerBars side="left" barRefs={barRefs} isActive={isListening} />
        <div className="relative flex size-24 items-center justify-center">
          <span
            ref={glowRef}
            aria-hidden
            className={cn(
              'absolute inset-0 rounded-full bg-emerald-400/50 blur-md transition-opacity duration-300',
              isListening ? 'opacity-70' : 'opacity-0',
              isConnecting && 'opacity-60 motion-safe:animate-pulse',
            )}
          />
          <button
            type="button"
            onClick={toggleMicrophone}
            disabled={isMicrophoneBlocked || isConnecting}
            aria-pressed={isListening}
            aria-label={isListening ? '말하기 멈추기' : '말하기 시작'}
            className={cn(
              'relative flex size-20 items-center justify-center rounded-full transition-[background-color,box-shadow,transform] duration-200 active:scale-95 disabled:active:scale-100',
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
          </button>
        </div>
        <EqualizerBars side="right" barRefs={barRefs} isActive={isListening} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * EqualizerBars
 * -----------------------------------------------------------------------------------------------*/

interface EqualizerBarsProps {
  side: 'left' | 'right';
  barRefs: React.RefObject<(HTMLSpanElement | null)[]>;
  isActive: boolean;
}

/** 마이크 한쪽의 세로 막대들. 높이는 useMicrophoneLevel이 DOM에 바로 쓴다 */
function EqualizerBars({ side, barRefs, isActive }: EqualizerBarsProps) {
  const offset = side === 'left' ? 0 : BAR_COUNT;

  return (
    <div aria-hidden className="flex h-14 items-center gap-[5px]">
      {Array.from({ length: BAR_COUNT }, (_, index) => (
        <span
          key={index}
          ref={(element) => {
            barRefs.current[offset + index] = element;
          }}
          style={{ transform: `scaleY(${BAR_REST_SCALE})` }}
          className={cn(
            'h-14 w-[5px] origin-center rounded-full transition-colors duration-300',
            isActive ? 'bg-emerald-500' : 'bg-gray-300',
          )}
        />
      ))}
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
  hasText: boolean;
}

function VoiceStatus({ failure, isConnecting, isListening, hasText }: VoiceStatusProps) {
  if (failure) {
    return (
      <p
        role="alert"
        className="mt-2 text-center text-[15px] leading-relaxed break-keep text-red-600"
      >
        {FAILURE_MESSAGE[failure]}
      </p>
    );
  }

  return (
    <p
      aria-live="polite"
      className={cn(
        'mt-2 text-center text-[15px] leading-relaxed break-keep',
        isListening ? 'text-emerald-700' : 'text-gray-500',
      )}
    >
      {getStatusMessage({ isConnecting, isListening, hasText })}
    </p>
  );
}

function getStatusMessage({
  isConnecting,
  isListening,
  hasText,
}: Omit<VoiceStatusProps, 'failure'>) {
  if (isConnecting) return '마이크를 켜는 중이에요';
  if (isListening) return '듣고 있어요';
  if (hasText) return '다 말했으면 정리하기를 눌러 주세요';
  return '마이크를 누르고 말해 주세요';
}
