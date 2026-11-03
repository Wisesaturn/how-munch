'use client';

import { useEffect, useRef, useState } from 'react';

import { format } from 'date-fns';

import { BottomSheet, Button } from '@/commons/ui';

import { useParseMealMutation } from '../api/mutations';
import { type ParsedMealResult } from '../lib';
import { useRealtimeTranscription } from '../model';

import { type OpenMealEditorInput, VoiceMealReview } from './VoiceMealReview';
import { VoiceSpeakPanel } from './VoiceSpeakPanel';

const PARSE_FAILED =
  '말한 내용을 정리하지 못했어요. 잠시 뒤 다시 시도하거나 글을 고쳐서 다시 정리해 주세요';

interface VoiceMealEntrySheetProps {
  open: boolean;
  onClose: () => void;
  householdId: string;
  onOpenEditor: (input: OpenMealEditorInput) => void;
}

/**
 * 말로 기록하기 시트. 열리면 바로 듣기 시작하고, "정리하기"를 누르면 같은 시트가 결과 확인으로 바뀐다.
 * 받아쓴 글은 "다시 말하기"로 돌아와도 남아 있다.
 */
export function VoiceMealEntrySheet({
  open,
  onClose,
  householdId,
  onOpenEditor,
}: VoiceMealEntrySheetProps) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ParsedMealResult | null>(null);
  const transcription = useRealtimeTranscription({ onTranscriptChange: setText });
  const parseMeal = useParseMealMutation();

  const isListening = transcription.status === 'listening';
  const isConnecting = transcription.status === 'connecting';

  // 열리자마자 듣기 시작한다. 개발 모드에서 effect가 두 번 돌아도 한 번만 연결한다
  const hasAutoStartedRef = useRef(false);
  useEffect(function startListeningOnOpen() {
    if (hasAutoStartedRef.current || !transcription.isSupported) return;
    hasAutoStartedRef.current = true;
    void transcription.start('');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 처음 열릴 때 한 번만
  }, []);

  function close() {
    transcription.stop();
    onClose();
  }

  function organize() {
    transcription.stop();
    const now = new Date();
    parseMeal.mutate(
      {
        householdId,
        text: text.trim(),
        today: format(now, 'yyyy-MM-dd'),
        now: format(now, 'HH:mm'),
      },
      { onSuccess: setResult },
    );
  }

  return (
    <BottomSheet open={open} onClose={close}>
      <BottomSheet.Header heading="말로 기록하기" className="sr-only" />
      {result ? (
        <VoiceMealReview
          householdId={householdId}
          result={result}
          onSaved={close}
          onSpeakAgain={() => setResult(null)}
          onOpenEditor={(input) => {
            close();
            onOpenEditor(input);
          }}
        />
      ) : (
        <>
          <BottomSheet.Content className="pt-1 pb-6">
            <VoiceSpeakPanel
              text={text}
              onTextChange={setText}
              transcription={transcription}
              onClose={close}
            />
          </BottomSheet.Content>
          <BottomSheet.Footer>
            {parseMeal.isPending && (
              <p aria-live="polite" className="text-center text-[15px] break-keep text-gray-600">
                말한 내용을 식단, 재고, 식비로 나누는 중이에요
              </p>
            )}
            {parseMeal.isError && (
              <p role="alert" className="text-center text-[15px] break-keep text-red-600">
                {PARSE_FAILED}
              </p>
            )}
            <Button
              type="button"
              color="primary"
              size="lg"
              className="w-full text-base"
              onClick={organize}
              disabled={!text.trim() || isConnecting || parseMeal.isPending}
            >
              {parseMeal.isPending ? '정리하는 중이에요' : '정리하기'}
            </Button>
            {isListening && (
              <span className="sr-only">정리하기를 누르면 듣기를 멈추고 정리해요</span>
            )}
          </BottomSheet.Footer>
        </>
      )}
    </BottomSheet>
  );
}
