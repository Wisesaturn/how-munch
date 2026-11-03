'use client';

import { useEffect, useRef, useState } from 'react';

import { format } from 'date-fns';
import { overlay } from 'overlay-kit';

import { BottomSheet } from '@/commons/ui';

import { useParseMealMutation } from '../api/mutations';
import { type ParsedMealResult } from '../lib';
import { useRealtimeTranscription } from '../model';

import { VoiceSpeakPanel } from './VoiceSpeakPanel';

const PARSE_FAILED = '말한 내용을 정리하지 못했어요. 마이크를 눌러 다시 말씀해주세요';
/** 말이 끊긴 뒤 이만큼 조용하면 다 말한 것으로 보고 정리한다 */
const SILENCE_TO_FINISH_MS = 3000;
/** 열고 나서 이만큼 아무 말이 없으면 듣기를 멈춘다 */
const SILENCE_TO_GIVE_UP_MS = 8000;
/** 시트가 내려가는 움직임이 끝난 뒤 지운다 */
const UNMOUNT_DELAY_MS = 300;

interface OpenVoiceMealEntrySheetInput {
  householdId: string;
  /** 정리가 끝나면 시트를 닫고 결과를 넘긴다 */
  onParsed: (result: ParsedMealResult) => void;
}

/**
 * @description 음성 기록 시트를 연다. 열 때마다 새로 만들어 앞서 말한 글은 남지 않는다.
 * 식단 헤더와 결과 화면의 "다시 말하기"가 같은 시트를 쓴다.
 */
export function openVoiceMealEntrySheet({ householdId, onParsed }: OpenVoiceMealEntrySheetInput) {
  overlay.open(({ isOpen, close, unmount }) => {
    function closeSheet() {
      close();
      window.setTimeout(unmount, UNMOUNT_DELAY_MS);
    }

    return (
      <VoiceMealEntrySheet
        open={isOpen}
        onClose={closeSheet}
        householdId={householdId}
        onParsed={(result) => {
          closeSheet();
          onParsed(result);
        }}
      />
    );
  });
}

interface VoiceMealEntrySheetProps {
  open: boolean;
  onClose: () => void;
  householdId: string;
  onParsed: (result: ParsedMealResult) => void;
}

/** 열리면 바로 듣기 시작하고, 다 말한 뒤 마이크를 다시 눌러 끄거나 3초 동안 말이 없으면 정리 API를 부른다 */
function VoiceMealEntrySheet({ open, onClose, householdId, onParsed }: VoiceMealEntrySheetProps) {
  const [text, setText] = useState('');
  const transcription = useRealtimeTranscription({ onTranscriptChange: setText });
  const parseMeal = useParseMealMutation();

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

  // 듣는 동안 받아쓴 글이 바뀔 때마다 시계를 다시 맞춘다. 말한 뒤 3초 조용하면 끄고 정리하고,
  // 아무 말도 없이 8초가 지나면 듣기만 멈춘다(받아쓰기 쪽이 "인식하지 못했어요"를 띄운다)
  const hasSpoken = text.trim().length > 0;
  useEffect(
    function finishOnSilence() {
      if (transcription.status !== 'listening') return;
      const timer = window.setTimeout(
        () => {
          transcription.stop();
          if (hasSpoken) organize();
        },
        hasSpoken ? SILENCE_TO_FINISH_MS : SILENCE_TO_GIVE_UP_MS,
      );
      return () => window.clearTimeout(timer);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 글과 듣기 상태가 바뀔 때만 다시 맞춘다
    [text, transcription.status],
  );

  function organize() {
    if (!text.trim() || parseMeal.isPending) return;
    const now = new Date();
    parseMeal.mutate(
      {
        householdId,
        text: text.trim(),
        today: format(now, 'yyyy-MM-dd'),
        now: format(now, 'HH:mm'),
      },
      { onSuccess: onParsed },
    );
  }

  return (
    <BottomSheet open={open} onClose={close}>
      <BottomSheet.Header heading="음성 기록" className="sr-only" />
      <BottomSheet.Content className="pt-1 pb-8">
        <VoiceSpeakPanel
          text={text}
          transcription={transcription}
          isOrganizing={parseMeal.isPending}
          organizeError={parseMeal.isError && transcription.status === 'idle' ? PARSE_FAILED : null}
          onStopListening={organize}
          onClose={close}
        />
      </BottomSheet.Content>
    </BottomSheet>
  );
}
