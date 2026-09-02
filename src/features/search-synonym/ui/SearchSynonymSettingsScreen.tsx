'use client';

import { useState } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { ChevronLeft, RotateCcw, X } from 'lucide-react';

import { Button, ConfirmDialog, EmptyState, Toast } from '@/commons/ui';

import {
  groupSynonymTerms,
  useDeleteSearchSynonymMutation,
  useResetSearchSynonymsMutation,
  useSearchSynonymsQuery,
} from '@/entities/search-synonym';

interface SearchSynonymSettingsScreenProps {
  /** 화면 닫기 핸들러 (Activity에서 주입) */
  onClose: () => void;
}

function resolveErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return '검색 별칭을 변경하지 못했습니다';
}

/** 검색 별칭 관리 Screen — 그룹 단위로 확인하고 단어·그룹을 삭제하거나 기본값으로 되돌린다 */
export function SearchSynonymSettingsScreen({ onClose }: SearchSynonymSettingsScreenProps) {
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const { data: terms, isLoading } = useSearchSynonymsQuery();
  const deleteMutation = useDeleteSearchSynonymMutation();
  const resetMutation = useResetSearchSynonymsMutation();

  const groups = groupSynonymTerms(terms ?? []);

  function removeTerm(termId: string) {
    deleteMutation.mutate(
      { termId },
      { onError: (error) => Toast.error(resolveErrorMessage(error)) },
    );
  }

  function removeGroup(groupKey: string) {
    deleteMutation.mutate(
      { groupKey },
      { onError: (error) => Toast.error(resolveErrorMessage(error)) },
    );
  }

  function resetToDefault() {
    resetMutation.mutate(undefined, {
      onSuccess: () => Toast.success('기본 별칭으로 되돌렸습니다'),
      onError: (error) => Toast.error(resolveErrorMessage(error)),
    });
  }

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: '검색 별칭 관리',
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
      <div className="space-y-4 p-4">
        <p className="px-1 text-xs text-gray-500">
          같은 줄에 있는 단어들은 검색할 때 서로 함께 찾습니다.
        </p>

        {!isLoading && groups.length === 0 && (
          <EmptyState>
            <EmptyState.Content>
              <EmptyState.Description>등록된 검색 별칭이 없습니다</EmptyState.Description>
            </EmptyState.Content>
          </EmptyState>
        )}

        <ul className="space-y-2">
          {groups.map(({ groupKey, terms: groupTerms }) => (
            <li key={groupKey} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {groupTerms.map((term) => (
                    <span
                      key={term.id}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm text-gray-700"
                    >
                      {term.term}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-4 text-gray-400"
                        onClick={() => removeTerm(term.id)}
                        aria-label={`${term.term} 삭제`}
                      >
                        <X className="size-3" />
                      </Button>
                    </span>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-xs text-gray-400"
                  onClick={() => removeGroup(groupKey)}
                >
                  그룹 삭제
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setResetDialogOpen(true)}
          disabled={resetMutation.isPending}
        >
          <RotateCcw className="size-4" />
          기본값 복원
        </Button>
      </div>

      <ConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title="기본값으로 되돌릴까요?"
        description="직접 추가한 별칭이 모두 삭제되고 기본 상태로 돌아갑니다."
        confirmLabel="복원"
        onConfirm={resetToDefault}
      />
    </AppScreen>
  );
}
