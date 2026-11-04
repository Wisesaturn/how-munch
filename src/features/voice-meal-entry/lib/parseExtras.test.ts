import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// 테스트 실행기가 경로 별칭을 풀지 못해 상대 경로로 가져온다
import { matchTerm } from '../../../commons/lib/search/matchTerm';
import { createSynonymIndex } from '../../../commons/lib/search/synonym';

import {
  applyPurchaseItem,
  collectPurchaseLinks,
  resolvePurchases,
  resolveStockUpdates,
  toStockUpdate,
} from './parseExtras';
import { type VoiceFridgeItem } from './parseMeal';

const ITEMS: VoiceFridgeItem[] = [
  {
    id: 'egg',
    name: '계란',
    brand: null,
    unit: 'count',
    category_id: 'c-egg',
    batches: [
      { id: 'egg-new', purchased_date: '2026-11-02', quantity: 4 },
      { id: 'egg-old', purchased_date: '2026-10-28', quantity: 3 },
    ],
  },
  {
    id: 'milk',
    name: '우유',
    brand: '서울우유',
    unit: 'ml',
    category_id: 'c-dairy',
    batches: [{ id: 'milk-1', purchased_date: '2026-11-01', quantity: 900 }],
  },
  {
    id: 'berry-milk',
    name: '딸기우유',
    brand: null,
    unit: 'count',
    category_id: 'c-dairy',
    batches: [{ id: 'berry-1', purchased_date: '2026-11-01', quantity: 2 }],
  },
];
const CATEGORIES = [
  { id: 'c-meat', code: 'meat', label: '육류' },
  { id: 'c-etc', code: 'etc', label: '기타' },
];
const matchItem = (term: string) =>
  matchTerm(
    ITEMS,
    term,
    (item) => (item.brand ? [item.name, `${item.brand}${item.name}`] : [item.name]),
    (item) => (item.brand ? [item.brand] : []),
    createSynonymIndex([]),
  );

describe('resolvePurchases', () => {
  it('이름 전체가 같은 품목이 있으면 이름, 브랜드, 단위, 분류를 품목에 맞춘다', () => {
    const [purchase] = resolvePurchases(
      [{ name: '계란', brand: '농협', category_code: 'meat', unit: 'kg', count: 2, price: 8000 }],
      (term) => matchItem(term === '농협계란' ? '계란' : term),
      CATEGORIES,
    );
    assert.deepEqual(purchase, {
      name: '계란',
      brand: '',
      category_id: 'c-egg',
      unit: 'count',
      count: 2,
      price: 8000,
      fridge_item_id: 'egg',
      candidate_ids: undefined,
    });
  });

  it('부분일치로 걸린 품목은 자동으로 잇지 않고 후보로 남긴다', () => {
    const matchOnlyBerry = (term: string) =>
      matchTerm(
        [ITEMS[2]],
        term,
        (item) => [item.name],
        () => [],
        createSynonymIndex([]),
      );
    const [purchase] = resolvePurchases(
      [{ name: '우유', category_code: 'etc', unit: 'count', count: 1 }],
      matchOnlyBerry,
      CATEGORIES,
    );
    assert.equal(purchase.fridge_item_id, null);
    assert.deepEqual(purchase.candidate_ids, ['berry-milk']);
  });

  it('냉장고에 없으면 새 품목으로 두고 분류 코드가 없으면 기타, 금액이 없으면 0이다', () => {
    const [purchase] = resolvePurchases(
      [{ name: '양파', unit: 'count', count: 1, price: null }],
      matchItem,
      CATEGORIES,
    );
    assert.equal(purchase.fridge_item_id, null);
    assert.equal(purchase.candidate_ids, undefined);
    assert.equal(purchase.category_id, 'c-etc');
    assert.equal(purchase.price, 0);
  });

  it('후보에서 고른 품목에 장보기를 맞춘다', () => {
    const [purchase] = resolvePurchases(
      [{ name: '우유', category_code: 'etc', unit: 'count', count: 1 }],
      () => ({ best: null, isWhole: false, candidates: [ITEMS[1], ITEMS[2]] }),
      CATEGORIES,
    );
    const picked = applyPurchaseItem(purchase, ITEMS[1]);
    assert.equal(picked.fridge_item_id, 'milk');
    assert.equal(picked.brand, '서울우유');
    assert.equal(picked.unit, 'ml');
    assert.equal(picked.candidate_ids, undefined);
  });
});

describe('collectPurchaseLinks', () => {
  it('산 개수를 넘지 않게 메뉴 재료로 잇는다', () => {
    const [purchase] = resolvePurchases(
      [{ name: '양파', unit: 'count', count: 2 }],
      matchItem,
      CATEGORIES,
    );
    const links = collectPurchaseLinks(
      [{ name: '볶음', ingredients: [{ purchase_index: 0, amount: 5 }] }],
      [purchase],
    );
    assert.deepEqual(links, [
      { dish_name: '볶음', purchase_index: 0, amount: 2, usage_status: 'used' },
    ]);
  });
});

describe('resolveStockUpdates', () => {
  it('남은 개수는 오래된 구매분부터 줄인다', () => {
    const { updates } = resolveStockUpdates(
      [{ spoken: '계란', action: 'set_remaining', remaining: 2 }],
      matchItem,
    );
    assert.equal(updates[0].after, 2);
    assert.deepEqual(updates[0].batches, [
      { batch_id: 'egg-old', current_quantity: 0 },
      { batch_id: 'egg-new', current_quantity: 2 },
    ]);
  });

  it('버림은 전부 0으로 본다', () => {
    const { updates } = resolveStockUpdates([{ spoken: '계란', action: 'discard' }], matchItem);
    assert.equal(updates[0].action, 'discard');
    assert.equal(updates[0].after, 0);
  });

  it('지금보다 많이 남았다고 하면 건너뛰고 이유를 남긴다', () => {
    const { updates, skipped } = resolveStockUpdates(
      [{ spoken: '계란', action: 'set_remaining', remaining: 10 }],
      matchItem,
    );
    assert.equal(updates.length, 0);
    assert.equal(skipped[0].spoken, '계란');
  });

  it('후보가 여러 건이면 고를 항목으로 남긴다', () => {
    const { updates, pending } = resolveStockUpdates(
      [{ spoken: '우유', action: 'discard' }],
      () => ({ best: null, isWhole: false, candidates: [ITEMS[1], ITEMS[2]] }),
    );
    assert.equal(updates.length, 0);
    assert.deepEqual(pending, [
      {
        id: 'stock:우유',
        spoken: '우유',
        action: 'discard',
        remaining: null,
        candidate_ids: ['milk', 'berry-milk'],
      },
    ]);
  });

  it('못 찾으면 건너뛰고 이유를 남긴다', () => {
    const { skipped } = resolveStockUpdates([{ spoken: '식빵', action: 'discard' }], matchItem);
    assert.deepEqual(skipped, [{ spoken: '식빵', reason: '냉장고에서 찾지 못했어요' }]);
  });
});

describe('toStockUpdate', () => {
  it('무게 단위 남은 양은 바꿀 수 없다고 알린다', () => {
    const resolved = toStockUpdate(ITEMS[1], {
      action: 'set_remaining',
      remaining: 100,
      spoken: '우유',
    });
    assert.ok(resolved && 'reason' in resolved);
  });
});
