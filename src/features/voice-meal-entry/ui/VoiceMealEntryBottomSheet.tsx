'use client';

import { useState } from 'react';

import { Mic } from 'lucide-react';

import { cn } from '@/commons/lib';
import { BottomSheet, Button, Textarea } from '@/commons/ui';

import { type TranscriptionFailure, useRealtimeTranscription } from '../model';

/* -------------------------------------------------------------------------------------------------
 * Constants
 * -----------------------------------------------------------------------------------------------*/

const FAILURE_MESSAGE: Record<TranscriptionFailure, string> = {
  'permission-denied':
    '마이크 권한이 없어 앱의 마이크로는 기록할 수 없어요. 키보드의 마이크 버튼이나 글로 적어 주세요',
  unavailable:
    '이 기기에서는 앱의 마이크를 쓸 수 없어요. 키보드의 마이크 버튼이나 글로 적어 주세요',
  'no-speech': '말소리를 알아듣지 못했어요. 조용한 곳에서 다시 말하거나 글로 적어 주세요',
  'connection-failed':
    '음성 인식에 연결하지 못했어요. 잠시 뒤 마이크를 다시 누르거나 글로 적어 주세요',
};

/* -------------------------------------------------------------------------------------------------
 * VoiceMealEntryBottomSheet
 * -----------------------------------------------------------------------------------------------*/

interface VoiceMealEntryBottomSheetProps {
  open: boolean;
  onClose: () => void;
}

/** 먹은 것을 말하거나 적는 시트 — 마이크 받아쓰기가 되면 말하는 동안 입력칸이 채워진다 */
export function VoiceMealEntryBottomSheet({ open, onClose }: VoiceMealEntryBottomSheetProps) {
  const [text, setText] = useState('');
  const transcription = useRealtimeTranscription({ onTranscriptChange: setText });

  const isListening = transcription.status === 'listening';
  const isConnecting = transcription.status === 'connecting';

  function toggleMicrophone() {
    if (transcription.status === 'idle') {
      void transcription.start(text);
      return;
    }
    transcription.stop();
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheet.Header heading="먹은 것을 말하거나 적어 주세요" />
      <BottomSheet.Content className="flex flex-col gap-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        <p className="text-[15px] leading-relaxed break-keep text-gray-600">
          키보드의 마이크 버튼을 누르면 말로 적을 수 있어요
        </p>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          readOnly={isListening || isConnecting}
          placeholder="예: 점심에 김치찌개 먹었고 15,000원 냈어"
          aria-label="먹은 것"
          className="break-keep"
        />
        {transcription.isSupported && (
          <Button
            type="button"
            variant={isListening ? 'default' : 'outline'}
            color="primary"
            size="lg"
            onClick={toggleMicrophone}
            disabled={isConnecting}
            aria-pressed={isListening}
            className="w-full text-base"
          >
            <Mic className={cn('size-5', isListening && 'motion-safe:animate-pulse')} aria-hidden />
            {isListening ? '말하기 멈추기' : '마이크로 말하기'}
          </Button>
        )}
        <VoiceMealEntryStatus
          isConnecting={isConnecting}
          isListening={isListening}
          failure={transcription.failure}
        />
      </BottomSheet.Content>
    </BottomSheet>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Status
 * -----------------------------------------------------------------------------------------------*/

interface VoiceMealEntryStatusProps {
  isConnecting: boolean;
  isListening: boolean;
  failure: TranscriptionFailure | null;
}

function VoiceMealEntryStatus({ isConnecting, isListening, failure }: VoiceMealEntryStatusProps) {
  if (failure) {
    return (
      <p role="alert" className="text-[15px] leading-relaxed break-keep text-red-600">
        {FAILURE_MESSAGE[failure]}
      </p>
    );
  }
  if (isConnecting) {
    return (
      <p aria-live="polite" className="text-[15px] leading-relaxed break-keep text-gray-600">
        마이크를 켜는 중이에요
      </p>
    );
  }
  if (isListening) {
    return (
      <p aria-live="polite" className="text-[15px] leading-relaxed break-keep text-emerald-700">
        듣고 있어요. 말이 끝나면 마이크를 한 번 더 눌러 주세요
      </p>
    );
  }
  return null;
}
