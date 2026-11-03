'use client';

import { Mic } from 'lucide-react';
import { overlay } from 'overlay-kit';

import { Button } from '@/commons/ui';

import { VoiceMealEntryOverlay } from './VoiceMealEntryOverlay';

/** 식단 탭 헤더 오른쪽의 마이크 — 누르면 화면을 덮는 말하기 영역이 열린다 */
export function VoiceMealEntryHeaderButton() {
  function openOverlay() {
    overlay.open(({ isOpen, close, unmount }) => (
      <VoiceMealEntryOverlay open={isOpen} onClose={close} onExited={unmount} />
    ));
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={openOverlay}
      aria-label="말로 기록하기"
      aria-haspopup="dialog"
      // 보이는 크기는 다른 헤더 아이콘과 맞추고, 누르는 영역만 44px로 넓힌다
      className="relative after:absolute after:-inset-1 after:content-['']"
    >
      <Mic className="size-5" />
    </Button>
  );
}
