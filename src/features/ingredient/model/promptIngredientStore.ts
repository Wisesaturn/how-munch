import { create } from 'zustand';

import { type StagedItem } from '../lib/parseAiResponse';

export type SaveState = 'idle' | 'saving' | 'success' | 'error';

interface PromptIngredientState {
  items: StagedItem[];
  checkedIds: string[];
  saveStates: Record<string, SaveState>;
  setItems: (items: StagedItem[]) => void;
  updateItem: (id: string, updates: Partial<StagedItem>) => void;
  toggleCheck: (id: string) => void;
  toggleAll: () => void;
  setSaveState: (id: string, state: SaveState) => void;
  reset: () => void;
}

/**
 * @description AI 영수증 분석 결과를 스테이징 상태로 관리하는 전역 스토어.
 * 파싱된 StagedItem 목록, 체크 상태, 저장 진행 상태를 보관한다.
 */
export const usePromptIngredientStore = create<PromptIngredientState>((set, get) => ({
  items: [],
  checkedIds: [],
  saveStates: {},

  setItems(items) {
    set({
      items,
      checkedIds: items.map((i) => i.id),
      saveStates: Object.fromEntries(items.map((i) => [i.id, 'idle'])),
    });
  },

  updateItem(id, updates) {
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));
  },

  toggleCheck(id) {
    const { checkedIds } = get();
    const next = checkedIds.includes(id)
      ? checkedIds.filter((cid) => cid !== id)
      : [...checkedIds, id];
    set({ checkedIds: next });
  },

  toggleAll() {
    const { items, checkedIds } = get();
    const allChecked = items.every((i) => checkedIds.includes(i.id));
    set({ checkedIds: allChecked ? [] : items.map((i) => i.id) });
  },

  setSaveState(id, state) {
    set((prev) => ({ saveStates: { ...prev.saveStates, [id]: state } }));
  },

  reset() {
    set({ items: [], checkedIds: [], saveStates: {} });
  },
}));
