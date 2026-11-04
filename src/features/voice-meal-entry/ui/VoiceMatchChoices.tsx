'use client';

import { josa } from 'es-hangul';
import { Search } from 'lucide-react';

import { Button, Chip, Toast } from '@/commons/ui';

import { useLinkSearchSynonymMutation } from '@/entities/search-synonym';

import { hasStock, type ParsedMealResult, type VoiceFridgeItem } from '../lib';
import { useVoiceRecordStore } from '../model';

const MESSAGE = {
  ambiguous: '어떤 품목인가요?',
  none: '냉장고에서 찾지 못했어요',
  noStock: '남은 재고가 없어요',
  emptyDish: '재료를 골라야 저장돼요',
  suggestion: '재료를 골라주세요',
};

function formatItemLabel(item: VoiceFridgeItem) {
  return item.brand ? `${item.brand} ${item.name}` : item.name;
}

/* -------------------------------------------------------------------------------------------------
 * CandidateChips
 * -----------------------------------------------------------------------------------------------*/

interface CandidateChipsProps {
  label: string;
  itemIds: string[];
  items: VoiceFridgeItem[];
  onPick: (itemId: string) => void;
  /** 후보 뒤에 붙는 다른 선택지 (새 품목으로 두기 등) */
  extra?: { label: string; onPress: () => void };
}

/** 말한 표현에 걸린 품목 후보 중 하나를 고르는 칩 묶음 */
export function CandidateChips({ label, itemIds, items, onPick, extra }: CandidateChipsProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[15px] break-keep text-gray-700">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {itemIds.map((itemId) => {
          const item = items.find((candidate) => candidate.id === itemId);
          if (!item) return null;
          return (
            <Chip key={itemId} onClick={() => onPick(itemId)}>
              {formatItemLabel(item)}
            </Chip>
          );
        })}
        {extra && <Chip onClick={extra.onPress}>{extra.label}</Chip>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * VoiceDishChoices
 * -----------------------------------------------------------------------------------------------*/

interface VoiceDishChoicesProps {
  result: ParsedMealResult;
  linkedDishNames: Set<string>;
  onSearchFridgeItem: (props: {
    items: Array<{ id: string; name: string; brand: string | null; depleted: boolean }>;
    onSelect: (itemId: string) => void;
  }) => void;
}

/**
 * 메뉴마다 사용자가 정해야 할 재료를 보여 준다. 후보가 여러 건이면 고르고, 못 찾았거나 재고가 없으면 직접 찾는다.
 * 메뉴만 말했으면 메뉴 이름으로 찾은 품목을(없으면 Claude가 제안한 재료로 찾은 품목을) 미선택으로 보여 주고, 누른 것만 차감한다.
 * 말한 표현과 이름이 다른 자동 연결은 맞는지 알아볼 수 있게 함께 보여 준다.
 */
export function VoiceDishChoices({
  result,
  linkedDishNames,
  onSearchFridgeItem,
}: VoiceDishChoicesProps) {
  const {
    dishes,
    pendingIngredients,
    suggestions,
    pickIngredient,
    addIngredient,
    removeIngredient,
  } = useVoiceRecordStore();
  const items = result.fridgeItems;
  const searchOptions = items.filter(hasStock).map((item) => ({
    id: item.id,
    name: item.name,
    brand: item.brand,
    depleted: false,
  }));

  function warnPick(picked: { available: number | null; isEmpty: boolean }) {
    if (picked.isEmpty) Toast.warn(MESSAGE.noStock);
    else if (picked.available !== null) {
      Toast.warn(`${picked.available.toLocaleString('ko-KR')}개만 남아 있어요`);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {dishes.map((dish, dishIndex) => {
        // 이름이 같은 메뉴는 고를 항목을 한 번만 보여 준다
        if (dishes.findIndex((candidate) => candidate.name === dish.name) !== dishIndex)
          return null;
        const pendings = pendingIngredients.filter((pending) => pending.dish_name === dish.name);
        const suggestion = suggestions.find((candidate) => candidate.dish_name === dish.name);
        const pickedIds = new Set(dish.ingredients.map((row) => row.fridge_item_id));
        const autoLinks = (
          result.dishes.find((parsed) => parsed.name === dish.name)?.ingredients ?? []
        )
          .filter(
            (row) => row.spoken && row.spoken !== row.name && pickedIds.has(row.fridge_item_id),
          )
          .filter(
            (row, index, rows) =>
              rows.findIndex((other) => other.fridge_item_id === row.fridge_item_id) === index,
          );
        const isEmpty = dish.ingredients.length === 0 && !linkedDishNames.has(dish.name);
        const needsChoice = pendings.length > 0 || isEmpty || autoLinks.length > 0;
        const searchForDish = () =>
          onSearchFridgeItem({
            items: searchOptions,
            onSelect: (itemId) => {
              const item = items.find((candidate) => candidate.id === itemId);
              if (item) warnPick(addIngredient(dish.name, itemId, item.name));
            },
          });
        if (!needsChoice && !suggestion) return null;

        return (
          <div
            key={dish.name}
            data-slot="voice-dish-choices"
            className="flex flex-col gap-2.5 rounded-lg bg-gray-50 px-3 py-3"
          >
            <p className="text-[15px] font-medium break-keep text-gray-900">{dish.name}</p>

            {autoLinks.map((row) => (
              <p key={row.fridge_item_id} className="text-[15px] break-keep text-gray-600">
                {row.name} (말한 표현: {row.spoken})
              </p>
            ))}

            {pendings.map((pending) => {
              const search = () =>
                onSearchFridgeItem({
                  items: searchOptions,
                  onSelect: (itemId) => warnPick(pickIngredient(pending.id, itemId)),
                });

              if (pending.reason === 'ambiguous') {
                return (
                  <div key={pending.id} className="flex flex-col gap-2">
                    <CandidateChips
                      label={`${josa(pending.spoken, '은/는')} ${MESSAGE.ambiguous}`}
                      itemIds={pending.candidate_ids}
                      items={items}
                      onPick={(itemId) => warnPick(pickIngredient(pending.id, itemId))}
                    />
                    <SearchButton onPress={search} />
                  </div>
                );
              }
              return (
                <div key={pending.id} className="flex flex-col gap-1.5">
                  <p className="text-[15px] break-keep text-amber-700">
                    {pending.spoken}: {pending.reason === 'none' ? MESSAGE.none : MESSAGE.noStock}
                  </p>
                  <SearchButton onPress={search} />
                </div>
              );
            })}

            {suggestion && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[15px] break-keep text-gray-700">{MESSAGE.suggestion}</p>
                <div role="group" aria-label={MESSAGE.suggestion} className="flex flex-wrap gap-2">
                  {suggestion.item_ids.map((itemId) => {
                    const item = items.find((candidate) => candidate.id === itemId);
                    if (!item) return null;
                    return (
                      <Chip
                        key={itemId}
                        role="checkbox"
                        selected={pickedIds.has(itemId)}
                        onSelectedChange={(selected) => {
                          if (selected) warnPick(addIngredient(dish.name, itemId, item.name));
                          else removeIngredient(dish.name, itemId);
                        }}
                      >
                        {formatItemLabel(item)}
                      </Chip>
                    );
                  })}
                </div>
                <SearchButton onPress={searchForDish} />
              </div>
            )}

            {isEmpty && <p className="text-[15px] break-keep text-gray-500">{MESSAGE.emptyDish}</p>}
            {isEmpty && pendings.length === 0 && !suggestion && (
              <SearchButton onPress={searchForDish} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SearchButton({ onPress }: { onPress: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" className="w-full" onClick={onPress}>
      <Search className="size-4" /> 다른 재료 찾기
    </Button>
  );
}

/* -------------------------------------------------------------------------------------------------
 * SynonymOfferBanner
 * -----------------------------------------------------------------------------------------------*/

/** 못 찾았던 말을 직접 연결한 뒤 유사어로 기억할지 묻는다. 유사어는 가구 전체가 함께 쓴다 */
export function SynonymOfferBanner() {
  const synonymOffer = useVoiceRecordStore((state) => state.synonymOffer);
  const update = useVoiceRecordStore((state) => state.update);
  const linkSynonym = useLinkSearchSynonymMutation();

  if (!synonymOffer) return null;
  const { baseTerm, itemName } = synonymOffer;

  function dismiss() {
    update({ synonymOffer: null });
  }

  function remember() {
    linkSynonym.mutate(
      { baseTerm, terms: [itemName] },
      {
        onSuccess: () => {
          Toast.success('다음부터 함께 찾을게요');
          dismiss();
        },
        onError: () => Toast.error('기억하지 못했어요. 잠시 뒤 다시 눌러 주세요'),
      },
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border px-3 py-3">
      <p className="text-[15px] break-keep text-gray-900">
        {josa(baseTerm, '을/를')} {josa(itemName, '으로/로')} 기억할까요? 다음부터 바로 찾을 수
        있어요
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={remember}
          disabled={linkSynonym.isPending}
        >
          기억하기
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={dismiss}>
          괜찮아요
        </Button>
      </div>
    </div>
  );
}
