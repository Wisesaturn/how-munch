import { useEffect, useRef, useState } from 'react';

import { CommitStrategy, RealtimeEvents, Scribe } from '@elevenlabs/client';

import { useIssueScribeTokenMutation } from '../api/mutations';
import { composeTranscript, isMicrophonePermissionError, isMicrophoneSupported } from '../lib';

const SCRIBE_MODEL_ID = 'scribe_v2_realtime';
const SCRIBE_LANGUAGE_CODE = 'ko';

export type TranscriptionStatus = 'idle' | 'connecting' | 'listening';

/**
 * - `permission-denied`: 마이크 권한 거부
 * - `unavailable`: 마이크 장치가 없거나 열 수 없음
 * - `no-speech`: 듣는 동안 알아들은 말이 없음
 * - `connection-failed`: 토큰 발급이나 음성 인식 연결 실패
 */
export type TranscriptionFailure =
  | 'permission-denied'
  | 'unavailable'
  | 'no-speech'
  | 'connection-failed';

interface UseRealtimeTranscriptionOptions {
  /** 받아쓴 글이 바뀔 때마다 입력칸 전체 글을 넘긴다 */
  onTranscriptChange: (text: string) => void;
}

/**
 * @description ElevenLabs 실시간 받아쓰기(scribe_v2_realtime)로 마이크 말소리를 글로 바꾼다.
 * 시작하면 마이크 권한을 먼저 묻고, 서버에서 1회용 토큰을 받아 WebSocket으로 연결한 뒤
 * 말하는 동안 기존 글 뒤에 받아쓴 글을 붙여 넘긴다. 권한 거부·마이크 없음이면 `isSupported`가 false가 된다.
 */
export function useRealtimeTranscription({ onTranscriptChange }: UseRealtimeTranscriptionOptions) {
  const [isSupported, setIsSupported] = useState(isMicrophoneSupported);
  const [status, setStatus] = useState<TranscriptionStatus>('idle');
  const [failure, setFailure] = useState<TranscriptionFailure | null>(null);

  /** 진행 중인 받아쓰기를 사용자가 멈출 때 부르는 함수. 연결이 없으면 null */
  const stopSessionRef = useRef<(() => void) | null>(null);
  const issueScribeToken = useIssueScribeTokenMutation();

  useEffect(function stopSessionOnUnmount() {
    return () => stopSessionRef.current?.();
  }, []);

  async function requestMicrophone(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      setIsSupported(false);
      setFailure(isMicrophonePermissionError(error) ? 'permission-denied' : 'unavailable');
      return false;
    }
  }

  async function start(baseText: string) {
    if (status !== 'idle') return;
    setFailure(null);
    setStatus('connecting');

    if (!(await requestMicrophone())) {
      setStatus('idle');
      return;
    }

    let token: string;
    try {
      ({ token } = await issueScribeToken.mutateAsync());
    } catch {
      setFailure('connection-failed');
      setStatus('idle');
      return;
    }

    const committed: string[] = [];
    let partial = '';
    let hasHeardSpeech = false;
    let isFinished = false;

    const connection = Scribe.connect({
      token,
      modelId: SCRIBE_MODEL_ID,
      languageCode: SCRIBE_LANGUAGE_CODE,
      commitStrategy: CommitStrategy.VAD,
      microphone: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });

    function publishTranscript() {
      if (composeTranscript('', committed, partial).length > 0) hasHeardSpeech = true;
      onTranscriptChange(composeTranscript(baseText, committed, partial));
    }

    function finish(nextFailure: TranscriptionFailure | null) {
      if (isFinished) return;
      isFinished = true;
      stopSessionRef.current = null;
      connection.close();
      setStatus('idle');
      if (nextFailure) setFailure(nextFailure);
    }

    stopSessionRef.current = () => finish(hasHeardSpeech ? null : 'no-speech');

    connection.on(RealtimeEvents.SESSION_STARTED, () => setStatus('listening'));
    connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (data) => {
      partial = data.text;
      publishTranscript();
    });
    connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (data) => {
      committed.push(data.text);
      partial = '';
      publishTranscript();
    });
    connection.on(RealtimeEvents.ERROR, (error) => {
      if (isFinished) return;
      if (isMicrophonePermissionError(error)) {
        setIsSupported(false);
        finish('permission-denied');
        return;
      }
      console.error('[voice-meal-entry] 받아쓰기 오류', error);
      finish('connection-failed');
    });
    connection.on(RealtimeEvents.CLOSE, () => {
      finish(hasHeardSpeech ? null : 'connection-failed');
    });
  }

  function stop() {
    stopSessionRef.current?.();
  }

  return { isSupported, status, failure, start, stop };
}
