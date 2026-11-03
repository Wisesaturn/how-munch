import { useEffect, useRef } from 'react';

import { toBandLevels } from '../lib';

interface UseMicrophoneLevelOptions {
  /** true인 동안만 마이크를 열어 세기를 잰다 */
  active: boolean;
  bandCount: number;
  /** 화면을 그릴 때마다 묶음별 세기(0~1)를 넘긴다. 상태를 바꾸지 말고 DOM 스타일만 고친다 */
  onFrame: (bands: number[]) => void;
}

/** 새 값으로 바로 바꾸지 않고 이만큼씩 따라가 막대가 튀지 않게 한다 */
const RISE = 0.55;
const FALL = 0.18;

/**
 * @description 받아쓰기와 별도로 마이크를 하나 더 열어 말소리 세기를 잰다.
 * 받아쓰기 SDK는 오디오 노드를 내놓지 않아서, 게이지용 AnalyserNode를 따로 둔다.
 * 매 프레임 React 상태를 바꾸면 화면이 다시 그려지므로 `onFrame`으로 넘겨 DOM 스타일만 바꾼다.
 */
export function useMicrophoneLevel({ active, bandCount, onFrame }: UseMicrophoneLevelOptions) {
  const onFrameRef = useRef(onFrame);
  useEffect(function keepLatestOnFrame() {
    onFrameRef.current = onFrame;
  });

  useEffect(
    function measureWhileActive() {
      if (!active) {
        onFrameRef.current(Array(bandCount).fill(0));
        return;
      }

      let isStopped = false;
      let frameId = 0;
      let stream: MediaStream | null = null;
      let context: AudioContext | null = null;

      async function open() {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          return;
        }
        if (isStopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        context = new AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.5;
        context.createMediaStreamSource(stream).connect(analyser);

        const frequencyData = new Uint8Array(analyser.frequencyBinCount);
        const smoothed: number[] = Array(bandCount).fill(0);

        function draw() {
          analyser.getByteFrequencyData(frequencyData);
          const bands = toBandLevels(frequencyData, context!.sampleRate, bandCount);
          bands.forEach((level, index) => {
            const previous = smoothed[index];
            smoothed[index] = previous + (level - previous) * (level > previous ? RISE : FALL);
          });
          onFrameRef.current(smoothed);
          frameId = requestAnimationFrame(draw);
        }
        draw();
      }

      void open();

      return () => {
        isStopped = true;
        cancelAnimationFrame(frameId);
        stream?.getTracks().forEach((track) => track.stop());
        void context?.close();
        onFrameRef.current(Array(bandCount).fill(0));
      };
    },
    [active, bandCount],
  );
}
