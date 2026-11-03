'use client';

import { Mic } from 'lucide-react';
import { overlay } from 'overlay-kit';

import { Button } from '@/commons/ui';

import { VoiceMealEntrySheet } from './VoiceMealEntrySheet';
import { type OpenMealEditorInput } from './VoiceMealReview';

interface VoiceMealEntryHeaderButtonProps {
  householdId: string;
  /** "편집 화면에서 고치기" — 정리한 메뉴를 채운 식단 편집 화면을 연다 */
  onOpenEditor: (input: OpenMealEditorInput) => void;
}

/** 식단 탭 헤더 오른쪽의 마이크 — 누르면 말로 기록하기 시트가 열린다 */
export function VoiceMealEntryHeaderButton({
  householdId,
  onOpenEditor,
}: VoiceMealEntryHeaderButtonProps) {
  function openSheet() {
    overlay.open(({ isOpen, close, unmount }) => {
      function closeSheet() {
        close();
        window.setTimeout(unmount, 300);
      }

      return (
        <VoiceMealEntrySheet
          open={isOpen}
          onClose={closeSheet}
          householdId={householdId}
          onOpenEditor={onOpenEditor}
        />
      );
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={openSheet}
      aria-label="말로 기록하기"
      aria-haspopup="dialog"
      // 보이는 크기는 다른 헤더 아이콘과 맞추고, 누르는 영역만 44px로 넓힌다
      className="relative after:absolute after:-inset-1 after:content-['']"
    >
      <Mic className="size-5" />
    </Button>
  );
}
