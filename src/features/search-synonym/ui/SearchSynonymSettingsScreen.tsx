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
  return '유사어를 변경하지 못했습니다';
}

/** 유사어 매칭 Screen — 그룹 단위로 확인하고 단어·그룹을 삭제하거나 기본값으로 되돌린다 */
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
      onSuccess: () => Toast.success('기본 유사어로 되돌렸습니다'),
      onError: (error) => Toast.error(resolveErrorMessage(error)),
      onSettled: () => setResetDialogOpen(false),
    });
  }

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: '유사어 매칭',
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
      <div className="safe-area-padding-bottom">
        <div className="space-y-4 p-4 pb-8">
          <p className="px-1 text-xs text-gray-500">같은 그룹은 유사어로 묶여 함께 검색됩니다.</p>

          {!isLoading && groups.length === 0 && (
            <EmptyState>
              <EmptyState.Content>
                <EmptyState.Description>등록된 유사어가 없습니다</EmptyState.Description>
              </EmptyState.Content>
            </EmptyState>
          )}

          <ul className="space-y-2">
            {groups.map(({ groupKey, terms: groupTerms }) => (
              <li key={groupKey} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {groupTerms.map((term) => (
                      <span
                        key={term.id}
                        className="inline-flex h-8 items-center gap-0.5 rounded-full border border-gray-200 bg-gray-50 pr-1.5 pl-3 text-sm text-gray-700"
                      >
                        {term.term}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="size-5 rounded-full bg-transparent text-gray-400 hover:bg-gray-200 hover:text-gray-600"
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
                    size="xs"
                    className="h-8 shrink-0 bg-transparent px-2 text-xs text-gray-500 hover:bg-gray-100"
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
      </div>

      <ConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title="기본값으로 되돌릴까요?"
        description="직접 추가한 유사어가 모두 삭제되고 기본 상태로 돌아갑니다."
        confirmLabel="복원"
        confirmDisabled={resetMutation.isPending}
        onConfirm={resetToDefault}
      />
    </AppScreen>
  );
}
