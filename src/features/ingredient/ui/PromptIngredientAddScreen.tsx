'use client';

import { useEffect, useRef, useState } from 'react';

import { ChevronLeft, ClipboardCopy } from 'lucide-react';
import { AppScreen } from '@stackflow/plugin-basic-ui';

import { Button, Textarea, Toast } from '@/commons/ui';

import { useIngredientCategoriesQuery } from '@/entities/ingredient-category';

import { parseAiResponse, type StagedItem } from '../lib/parseAiResponse';
import { buildReceiptPrompt } from '../lib/receiptPrompt';
import { usePromptIngredientStore } from '../model/promptIngredientStore';

interface PromptIngredientAddScreenProps {
  onClose: () => void;
  onParsed: (items: StagedItem[]) => void;
  householdId: string;
}

export function PromptIngredientAddScreen({
  onClose,
  onParsed,
  householdId,
}: PromptIngredientAddScreenProps) {
  const [text, setText] = useState('');
  const setItems = usePromptIngredientStore((s) => s.setItems);
  const { data: categories = [] } = useIngredientCategoriesQuery(householdId);
  const hasTriedClipboard = useRef(false);

  useEffect(
    function tryClipboard() {
      if (hasTriedClipboard.current) return;
      hasTriedClipboard.current = true;

      if (!navigator.clipboard) return;

      navigator.clipboard
        .readText()
        .then((clipText) => {
          if (!clipText.trim().includes('"items"')) return;
          try {
            const parsed = parseAiResponse(clipText, categories);
            if (parsed.length === 0) return;
            setItems(parsed);
            onParsed(parsed);
          } catch {
            // 클립보드 내용이 유효하지 않으면 무시
          }
        })
        .catch(() => {
          // 클립보드 권한 없으면 무시
        });
    },
    [categories, onParsed, setItems],
  );

  function copyPrompt() {
    navigator.clipboard
      .writeText(buildReceiptPrompt(categories))
      .then(() => {
        Toast.success('프롬프트가 복사되었습니다');
      })
      .catch(() => {
        Toast.error('복사에 실패했습니다. 직접 선택 후 복사해주세요.');
      });
  }

  function load() {
    if (!text.trim()) {
      Toast.error('Claude 결과를 붙여넣어 주세요');
      return;
    }
    try {
      const parsed = parseAiResponse(text, categories);
      setItems(parsed);
      onParsed(parsed);
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : '분석에 실패했습니다');
    }
  }

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: 'AI에게 부탁하기',
        backButton: {
          render: () => (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="뒤로가기"
            >
              <ChevronLeft className="size-5" />
            </Button>
          ),
        },
      }}
    >
      <div className="flex flex-col gap-5 px-4 pt-5 pb-8">
        {/* 설명 */}
        <div className="flex flex-col gap-1">
          <p className="text-sm text-gray-500">
            Claude AI로 영수증이나 장보기 목록을 한 번에 입력할 수 있어요.
          </p>
          <ol className="mt-2 flex flex-col gap-1.5 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="shrink-0 font-semibold text-emerald-600">①</span>
              <span>아래 프롬프트를 복사해서 Claude.ai에 붙여넣어요</span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-semibold text-emerald-600">②</span>
              <span>영수증 사진이나 장보기 목록을 함께 전달해요</span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-semibold text-emerald-600">③</span>
              <span>Claude 답변을 복사한 뒤 아래 칸에 붙여넣어요</span>
            </li>
          </ol>
        </div>

        {/* 프롬프트 복사 */}
        <Button
          type="button"
          variant="outline"
          className="flex items-center justify-center gap-2"
          onClick={copyPrompt}
        >
          <ClipboardCopy className="size-4" />
          프롬프트 복사
        </Button>

        {/* JSON 입력 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Claude 결과 붙여넣기</label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='{"items": [...]} 형식의 Claude 답변을 여기에 붙여넣어요'
            className="min-h-[160px] resize-none font-mono text-xs"
          />
        </div>

        <Button type="button" color="primary" onClick={load} disabled={!text.trim()}>
          불러오기
        </Button>
      </div>
    </AppScreen>
  );
}
