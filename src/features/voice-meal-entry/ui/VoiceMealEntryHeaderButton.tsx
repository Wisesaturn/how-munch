'use client';

import { Mic } from 'lucide-react';

import { Button } from '@/commons/ui';

import { type ParsedMealResult } from '../lib';

import { openVoiceMealEntrySheet } from './VoiceMealEntrySheet';

interface VoiceMealEntryHeaderButtonProps {
  householdId: string;
  /** 정리가 끝나면 결과 화면을 연다 */
  onParsed: (result: ParsedMealResult) => void;
}

/** 식단 탭 헤더 오른쪽의 마이크 — 누르면 음성 기록 시트가 열린다 */
export function VoiceMealEntryHeaderButton({
  householdId,
  onParsed,
}: VoiceMealEntryHeaderButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => openVoiceMealEntrySheet({ householdId, onParsed })}
      aria-label="음성 기록"
      aria-haspopup="dialog"
      // 보이는 크기는 다른 헤더 아이콘과 맞추고, 누르는 영역만 44px로 넓힌다
      className="relative after:absolute after:-inset-1 after:content-['']"
    >
      <Mic className="size-5" />
    </Button>
  );
}
