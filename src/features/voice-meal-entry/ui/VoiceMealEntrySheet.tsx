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

/** 열리면 바로 듣기 시작하고, 다 말한 뒤 마이크를 다시 눌러 끄면 정리 API를 부른다 */
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
