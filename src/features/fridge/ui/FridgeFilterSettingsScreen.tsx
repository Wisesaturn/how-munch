'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { ChevronLeft } from 'lucide-react';

import { useUserSuspenseQuery } from '@/commons/api/auth/queries';
import { Button, Card, Switch } from '@/commons/ui';

import { useProfileQuery } from '@/entities/profile';

import { useFridgePreferencesQuery } from '../api/queries';
import { useUpsertFridgePreferencesMutation } from '../api/mutations';

import { CategoryExpiryDefaultsSection } from './CategoryExpiryDefaultsSection';

interface FridgeFilterSettingsScreenProps {
  onClose: () => void;
}

/** 냉장고 필터 설정 화면 */
export function FridgeFilterSettingsScreen({ onClose }: FridgeFilterSettingsScreenProps) {
  const { data: user } = useUserSuspenseQuery();
  const { data: profile } = useProfileQuery(user.id);
  const { data: preferences } = useFridgePreferencesQuery(user.id);
  const upsertFridgePreferencesMutation = useUpsertFridgePreferencesMutation();
  const householdId = profile?.household_id ?? null;

  const hideDepletedItems = preferences?.hide_depleted_fridge_items ?? false;

  function toggleHideDepletedItems(checked: boolean) {
    upsertFridgePreferencesMutation.mutate({
      userId: user.id,
      values: {
        hide_depleted_fridge_items: Boolean(checked),
      },
    });
  }

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: '냉장고 필터 설정',
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
        <Card>
          <Card.Content className="py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">소진한 재고 가리기</p>
                <p className="text-xs text-gray-500">수량이 없는 재고를 목록에서 숨깁니다</p>
              </div>
              <Switch
                checked={hideDepletedItems}
                onCheckedChange={toggleHideDepletedItems}
                disabled={upsertFridgePreferencesMutation.isPending}
              />
            </div>
          </Card.Content>
        </Card>

        {householdId ? <CategoryExpiryDefaultsSection householdId={householdId} /> : null}
      </div>
    </AppScreen>
  );
}
