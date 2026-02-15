import { groupBy } from 'es-toolkit';

import { CATEGORIES } from '@/commons/config';
import { EmptyState } from '@/commons/ui';

import { type FridgeItemBatch, type FridgeItemWithBatches } from '@/entities/fridge-item';

import { FridgeItemCard } from './FridgeItemCard';

interface FridgeItemListProps {
  items: FridgeItemWithBatches[];
  onEditItem: (item: FridgeItemWithBatches) => void;
  onAddBatch: (item: FridgeItemWithBatches) => void;
  onEditBatch: (batch: FridgeItemBatch, unit: 'count' | 'g') => void;
}

/** 카테고리별 그룹핑 냉장고 리스트 */
export function FridgeItemList({
  items,
  onEditItem,
  onAddBatch,
  onEditBatch,
}: FridgeItemListProps) {
  if (items.length === 0) {
    return <EmptyState title="등록된 재고가 없습니다" description="재료를 추가해 보세요" />;
  }

  const grouped = groupBy(items, (item) => item.category);
  const categoryOrder: string[] = CATEGORIES.map((c) => c.id);

  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b),
  );

  return (
    <div className="flex flex-col gap-4">
      {sortedCategories.map((categoryId) => {
        const cat = CATEGORIES.find((c) => c.id === categoryId);
        const label = cat ? `${cat.emoji} ${cat.label}` : categoryId;

        return (
          <section key={categoryId}>
            <h2 className="mb-2 text-xs font-semibold text-gray-500">{label}</h2>
            <div className="flex flex-col gap-2">
              {grouped[categoryId].map((item) => (
                <FridgeItemCard
                  key={item.id}
                  item={item}
                  onEditItem={onEditItem}
                  onAddBatch={onAddBatch}
                  onEditBatch={onEditBatch}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
