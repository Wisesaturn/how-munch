'use client';

import { useRef, useState } from 'react';

import { Plus, X } from 'lucide-react';

import { BottomSheet, Button, CTAAction, InputGroup, Toast } from '@/commons/ui';

import { useLinkSearchSynonymMutation } from '../api/mutations';

interface SearchSynonymLinkSheetProps {
  open: boolean;
  onClose: () => void;
  /** 검색창에 입력했던 단어 — 연결의 기준이 되며 시트에서 지울 수 없다 */
  baseTerm: string;
  /** 연결 저장에 성공했을 때 호출된다 */
  onLinked?: () => void;
}

function resolveErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return '유사어를 추가하지 못했습니다';
}

/** 검색어와 다른 이름을 같은 유사어 그룹으로 묶는 BottomSheet */
export function SearchSynonymLinkSheet({
  open,
  onClose,
  baseTerm,
  onLinked,
}: SearchSynonymLinkSheetProps) {
  const [draft, setDraft] = useState('');
  const [terms, setTerms] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const linkMutation = useLinkSearchSynonymMutation();

  /** 저장에 실패해도 입력 중이던 단어를 잃지 않도록, 초기화는 시트를 닫는 순간에만 한다 */
  function closeSheet() {
    setDraft('');
    setTerms([]);
    onClose();
  }

  function addTerm() {
    const trimmed = draft.trim();
    if (!trimmed) return;

    if (trimmed === baseTerm.trim() || terms.includes(trimmed)) {
      setDraft('');
      return;
    }

    setTerms((previous) => [...previous, trimmed]);
    setDraft('');
    inputRef.current?.focus();
  }

  function removeTerm(target: string) {
    setTerms((previous) => previous.filter((term) => term !== target));
  }

  function submitLink() {
    if (terms.length === 0) return;

    linkMutation.mutate(
      { baseTerm: baseTerm.trim(), terms },
      {
        onSuccess: () => {
          Toast.success('유사어를 추가했습니다');
          onLinked?.();
          closeSheet();
        },
        onError: (error) => Toast.error(resolveErrorMessage(error)),
      },
    );
  }

  return (
    <BottomSheet open={open} onClose={closeSheet}>
      <BottomSheet.Header heading="유사어 추가하기" />
      <BottomSheet.Content className="flex flex-col gap-4">
        <p className="text-sm text-gray-500">
          <span className="font-medium text-gray-900">{baseTerm}</span>
          (으)로 검색할 때 함께 찾을 유사어를 추가해 주세요.
          <br />
          짧은 단어일수록 잘 찾습니다 (예: 대란, 달걀)
        </p>

        <InputGroup>
          <InputGroup.Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              addTerm();
            }}
            placeholder="유사어를 입력하세요"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          <InputGroup.Addon align="inline-end" className="border-l-0 px-1">
            <InputGroup.Button type="button" onClick={addTerm} aria-label="단어 추가">
              <Plus className="size-4" />
            </InputGroup.Button>
          </InputGroup.Addon>
        </InputGroup>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-8 items-center rounded-full border border-emerald-600 bg-emerald-600 px-3 text-sm font-medium text-white">
            {baseTerm}
          </span>
          {terms.map((term) => (
            <span
              key={term}
              className="inline-flex h-8 items-center gap-0.5 rounded-full border border-gray-200 bg-white pr-1.5 pl-3 text-sm font-medium text-gray-600"
            >
              {term}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="size-5 rounded-full bg-transparent text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                onClick={() => removeTerm(term)}
                aria-label={`${term} 제거`}
              >
                <X className="size-3" />
              </Button>
            </span>
          ))}
        </div>
      </BottomSheet.Content>

      <BottomSheet.Footer>
        <CTAAction
          type="button"
          onClick={submitLink}
          disabled={terms.length === 0 || linkMutation.isPending}
        >
          추가하기
        </CTAAction>
      </BottomSheet.Footer>
    </BottomSheet>
  );
}
