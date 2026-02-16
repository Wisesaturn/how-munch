import { groupBy } from 'es-toolkit';
import { Search } from 'lucide-react';

import { CATEGORIES } from '@/commons/config';
import { EmptyState } from '@/commons/ui';

import { type FridgeItemBatch, type FridgeItemWithBatches } from '@/entities/fridge-item';

import { FridgeItemCard } from './FridgeItemCard';

interface FridgeItemListProps {
  items: FridgeItemWithBatches[];
  isSearching?: boolean;
  onEditItem: (item: FridgeItemWithBatches) => void;
  onAddBatch: (item: FridgeItemWithBatches) => void;
  onEditBatch: (batch: FridgeItemBatch, unit: 'count' | 'g') => void;
}

/** 카테고리별 그룹핑 냉장고 리스트 */
export function FridgeItemList({
  items,
  isSearching,
  onEditItem,
  onAddBatch,
  onEditBatch,
}: FridgeItemListProps) {
  if (items.length === 0) {
    if (isSearching) {
      return (
        <EmptyState
          icon={<Search className="size-5" />}
          title="검색 결과가 없습니다"
          description="다른 키워드로 검색해 보세요"
        />
      );
    }
    return <EmptyState title="등록된 재고가 없습니다" description="재료를 추가해 보세요" />;
  }

  const grouped = groupBy(items, (item) => item.category);
  const categoryOrder: string[] = CATEGORIES.map((c) => c.id);

  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b),
  );

  return (
    <div className="flex flex-col gap-5">
      {sortedCategories.map((categoryId) => {
        const cat = CATEGORIES.find((c) => c.id === categoryId);
        const label = cat ? `${cat.emoji} ${cat.label}` : categoryId;
        const categoryItems = grouped[categoryId];

        return (
          <section key={categoryId}>
            <div className="mb-2 flex items-center gap-1.5">
              <h2 className="text-xs font-semibold text-gray-500">{label}</h2>
              <span className="text-[10px] text-gray-400">{categoryItems.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {categoryItems.map((item) => (
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
