'use client';

import { Mic } from 'lucide-react';
import { overlay } from 'overlay-kit';

import { Button } from '@/commons/ui';

import { VoiceMealEntryBottomSheet } from './VoiceMealEntryBottomSheet';

/** 식단 탭의 "말로 기록하기" 입구 — 누르면 말하거나 적는 시트가 열린다 */
export function VoiceMealEntryButton() {
  function openSheet() {
    overlay.open(({ isOpen, close, unmount }) => {
      function closeSheet() {
        close();
        window.setTimeout(unmount, 200);
      }

      return <VoiceMealEntryBottomSheet open={isOpen} onClose={closeSheet} />;
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      color="primary"
      size="lg"
      onClick={openSheet}
      aria-haspopup="dialog"
      className="w-full text-base"
    >
      <Mic className="size-5" aria-hidden />
      말로 기록하기
    </Button>
  );
}
