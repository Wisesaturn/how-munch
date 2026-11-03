import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  extractJsonObject,
  guessMealType,
  resolveParsedMeal,
  type VoiceFridgeItem,
} from './parseMeal';

const ITEMS: VoiceFridgeItem[] = [
  {
    id: 'pork',
    name: '돼지고기',
    brand: null,
    unit: 'g',
    batches: [{ id: 'pork-1', purchased_date: '2026-11-01', quantity: 500 }],
  },
  {
    id: 'egg',
    name: '계란',
    brand: null,
    unit: 'count',
    batches: [
      { id: 'egg-new', purchased_date: '2026-11-02', quantity: 10 },
      { id: 'egg-old', purchased_date: '2026-10-28', quantity: 3 },
      { id: 'egg-empty', purchased_date: '2026-10-20', quantity: 0 },
    ],
  },
];
const CONTEXT = { today: '2026-11-03', now: '12:30' };

describe('resolveParsedMeal', () => {
  it('구매일이 가장 오래된 남은 구매분을 고르고 재고 미리보기를 만든다', () => {
    const result = resolveParsedMeal(
      {
        date: '2026-11-02',
        meal_type: 'dinner',
        dishes: [
          {
            name: '계란말이',
            ingredients: [
              { fridge_item_id: 'egg', spoken: '계란 두 개', amount: 2, depleted: false },
            ],
          },
        ],
      },
      ITEMS,
      CONTEXT,
    );
    assert.equal(result.date, '2026-11-02');
    assert.equal(result.type, 'dinner');
    assert.equal(result.dishes[0].ingredients[0].batch_id, 'egg-old');
    assert.deepEqual(
      result.stock.map(({ batch_id, before, after, mode }) => ({ batch_id, before, after, mode })),
      [{ batch_id: 'egg-old', before: 3, after: 1, mode: 'subtract' }],
    );
    assert.equal(result.mealKind, 'home');
  });

  it('개 단위 수량은 남은 재고를 넘지 않는다', () => {
    const result = resolveParsedMeal(
      {
        dishes: [
          {
            name: '계란찜',
            ingredients: [{ fridge_item_id: 'egg', spoken: '계란 다섯 개', amount: 5 }],
          },
        ],
      },
      ITEMS,
      CONTEXT,
    );
    assert.equal(result.dishes[0].ingredients[0].amount, 3);
  });

  it('무게 단위의 "다 썼어"는 소진으로 두고 재고를 0으로 보인다', () => {
    const result = resolveParsedMeal(
      {
        dishes: [
          {
            name: '제육볶음',
            ingredients: [{ fridge_item_id: 'pork', spoken: '돼지고기 다', depleted: true }],
          },
        ],
      },
      ITEMS,
      CONTEXT,
    );
    assert.equal(result.dishes[0].ingredients[0].usage_status, 'depleted');
    assert.equal(result.stock[0].after, 0);
    assert.equal(result.stock[0].mode, 'deplete');
  });

  it('목록에 없는 품목은 unmatched로 옮긴다', () => {
    const result = resolveParsedMeal(
      {
        dishes: [{ name: '토스트', ingredients: [{ fridge_item_id: 'bread', spoken: '식빵' }] }],
      },
      ITEMS,
      CONTEXT,
    );
    assert.equal(result.dishes[0].ingredients.length, 0);
    assert.deepEqual(result.unmatched, [{ spoken: '식빵', reason: '냉장고에서 찾지 못했어요' }]);
  });

  it('금액이 있으면 외식비를 만들고 메뉴 이름을 채운다', () => {
    const result = resolveParsedMeal(
      {
        meal_type: 'lunch',
        dishes: [{ name: '김치찌개', ingredients: [] }],
        expense: { price: 15000, kind: 'restaurant', brand: null, store: '배민', menu: null },
      },
      ITEMS,
      CONTEXT,
    );
    assert.deepEqual(result.expense, {
      kind: 'restaurant',
      brand: '',
      name: '김치찌개',
      store: '',
      price: 15000,
      date: '2026-11-03',
    });
    assert.equal(result.mealKind, 'out');
  });

  it('금액이 0이거나 없으면 식비를 만들지 않는다', () => {
    const result = resolveParsedMeal({ expense: { price: 0 } }, ITEMS, CONTEXT);
    assert.equal(result.expense, null);
  });

  it('끼니가 없으면 지금 시각으로 짐작한다', () => {
    const result = resolveParsedMeal({ dishes: [] }, ITEMS, { today: '2026-11-03', now: '08:10' });
    assert.equal(result.type, 'breakfast');
  });
});

describe('guessMealType', () => {
  it('시간대별로 끼니를 고른다', () => {
    assert.equal(guessMealType('07:00'), 'breakfast');
    assert.equal(guessMealType('13:00'), 'lunch');
    assert.equal(guessMealType('19:00'), 'dinner');
    assert.equal(guessMealType('23:30'), 'snack');
  });
});

describe('extractJsonObject', () => {
  it('코드 블록 표시가 섞여도 JSON을 꺼낸다', () => {
    assert.deepEqual(extractJsonObject('```json\n{"date":"2026-11-03"}\n```'), {
      date: '2026-11-03',
    });
  });

  it('JSON이 없으면 오류를 낸다', () => {
    assert.throws(() => extractJsonObject('정리하지 못했어요'));
  });
});
