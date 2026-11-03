import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { collectPurchaseLinks, resolvePurchases, resolveStockUpdates } from './parseExtras';
import { type VoiceFridgeItem } from './parseMeal';

const ITEMS: VoiceFridgeItem[] = [
  {
    id: 'egg',
    name: '계란',
    brand: null,
    unit: 'count',
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
    batches: [{ id: 'milk-1', purchased_date: '2026-11-01', quantity: 900 }],
  },
];
const CATEGORIES = [
  { id: 'c-meat', code: 'meat', label: '육류' },
  { id: 'c-etc', code: 'etc', label: '기타' },
];

describe('resolvePurchases', () => {
  it('냉장고에 같은 품목이 있으면 그 이름과 브랜드, 단위로 맞춘다', () => {
    const [purchase] = resolvePurchases(
      [
        {
          name: '달걀',
          fridge_item_id: 'egg',
          category_code: 'etc',
          unit: 'g',
          count: 10,
          price: 6000,
        },
      ],
      ITEMS,
      CATEGORIES,
    );
    assert.equal(purchase.name, '계란');
    assert.equal(purchase.unit, 'count');
    assert.equal(purchase.count, 10);
    assert.equal(purchase.fridge_item_id, 'egg');
  });

  it('분류 코드가 없으면 기타로 두고 금액이 없으면 0이다', () => {
    const [purchase] = resolvePurchases(
      [{ name: '삼겹살', category_code: 'nope', unit: 'g', count: 500 }],
      ITEMS,
      CATEGORIES,
    );
    assert.equal(purchase.category_id, 'c-etc');
    assert.equal(purchase.price, 0);
    assert.equal(purchase.count, 500);
  });
});

describe('collectPurchaseLinks', () => {
  it('산 개수를 넘지 않게 메뉴 재료로 잇는다', () => {
    const purchases = resolvePurchases(
      [{ name: '두부', category_code: 'etc', unit: 'count', count: 1 }],
      [],
      CATEGORIES,
    );
    const links = collectPurchaseLinks(
      [{ name: '두부조림', ingredients: [{ purchase_index: 0, amount: 3 }] }],
      purchases,
    );
    assert.deepEqual(links, [
      { dish_name: '두부조림', purchase_index: 0, amount: 1, usage_status: 'used' },
    ]);
  });
});

describe('resolveStockUpdates', () => {
  it('남은 개수는 오래된 구매분부터 줄인다', () => {
    const { updates } = resolveStockUpdates(
      [
        {
          fridge_item_id: 'egg',
          action: 'set_remaining',
          remaining: 2,
          spoken: '계란 두 개 남았어',
        },
      ],
      ITEMS,
    );
    assert.equal(updates[0].before, 7);
    assert.equal(updates[0].after, 2);
    assert.deepEqual(updates[0].batches, [
      { batch_id: 'egg-old', current_quantity: 0 },
      { batch_id: 'egg-new', current_quantity: 2 },
    ]);
  });

  it('버림은 전부 0으로 본다', () => {
    const { updates } = resolveStockUpdates(
      [{ fridge_item_id: 'milk', action: 'discard', spoken: '우유 버렸어' }],
      ITEMS,
    );
    assert.equal(updates[0].action, 'discard');
    assert.equal(updates[0].after, 0);
  });

  it('지금보다 많이 남았다고 하면 건너뛰고 이유를 남긴다', () => {
    const { updates, skipped } = resolveStockUpdates(
      [
        {
          fridge_item_id: 'egg',
          action: 'set_remaining',
          remaining: 9,
          spoken: '계란 아홉 개 남았어',
        },
      ],
      ITEMS,
    );
    assert.equal(updates.length, 0);
    assert.equal(skipped[0].spoken, '계란 아홉 개 남았어');
  });
});
