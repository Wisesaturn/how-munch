import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// 테스트 실행기가 경로 별칭을 풀지 못해 상대 경로로 가져온다
import { matchTerm } from '../../../commons/lib/search/matchTerm';
import { createSynonymIndex } from '../../../commons/lib/search/synonym';

import {
  allocateIngredient,
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
    category_id: 'c-meat',
    batches: [
      { id: 'pork-new', purchased_date: '2026-11-02', quantity: 300 },
      { id: 'pork-old', purchased_date: '2026-11-01', quantity: 500 },
    ],
  },
  {
    id: 'egg',
    name: '계란',
    brand: null,
    unit: 'count',
    category_id: 'c-egg',
    batches: [
      { id: 'egg-new', purchased_date: '2026-11-02', quantity: 10 },
      { id: 'egg-old', purchased_date: '2026-10-28', quantity: 3 },
      { id: 'egg-empty', purchased_date: '2026-10-20', quantity: 0 },
    ],
  },
  {
    id: 'seoul-milk',
    name: '서울우유',
    brand: null,
    unit: 'count',
    category_id: 'c-dairy',
    batches: [{ id: 'seoul-1', purchased_date: '2026-11-01', quantity: 1 }],
  },
  {
    id: 'berry-milk',
    name: '딸기우유',
    brand: null,
    unit: 'count',
    category_id: 'c-dairy',
    batches: [{ id: 'berry-1', purchased_date: '2026-11-01', quantity: 2 }],
  },
  {
    id: 'tofu',
    name: '두부',
    brand: null,
    unit: 'count',
    category_id: 'c-etc',
    batches: [{ id: 'tofu-1', purchased_date: '2026-11-01', quantity: 0 }],
  },
];
const SYNONYMS = createSynonymIndex([{ groupKey: 'egg', terms: ['계란', '달걀'] }]);
const matchItem = (term: string) =>
  matchTerm(
    ITEMS,
    term,
    (item) => [item.name],
    () => [],
    SYNONYMS,
  );
const CONTEXT = { today: '2026-11-03', now: '12:30', matchItem };

describe('resolveParsedMeal', () => {
  it('유사어로 찾은 품목의 오래된 구매분을 고르고 재고 미리보기를 만든다', () => {
    const result = resolveParsedMeal(
      {
        date: '2026-11-02',
        meal_type: 'dinner',
        dishes: [
          {
            name: '계란말이',
            ingredients: [{ spoken: '달걀', amount: 2, depleted: false }],
          },
        ],
      },
      ITEMS,
      CONTEXT,
    );
    assert.equal(result.date, '2026-11-02');
    assert.equal(result.type, 'dinner');
    assert.equal(result.dishes[0].ingredients[0].batch_id, 'egg-old');
    assert.equal(result.dishes[0].ingredients[0].spoken, '달걀');
    assert.deepEqual(
      result.stock.map(({ batch_id, before, after, mode }) => ({ batch_id, before, after, mode })),
      [{ batch_id: 'egg-old', before: 3, after: 1, mode: 'subtract' }],
    );
    assert.equal(result.mealKind, 'home');
  });

  it('오래된 구매분보다 많이 말하면 다음 구매분까지 나눠 잡는다', () => {
    const result = resolveParsedMeal(
      { dishes: [{ name: '계란찜', ingredients: [{ spoken: '계란', amount: 5 }] }] },
      ITEMS,
      CONTEXT,
    );
    assert.deepEqual(
      result.dishes[0].ingredients.map(({ batch_id, amount }) => ({ batch_id, amount })),
      [
        { batch_id: 'egg-old', amount: 3 },
        { batch_id: 'egg-new', amount: 2 },
      ],
    );
    assert.deepEqual(result.shortages, []);
  });

  it('전체 재고보다 많이 말하면 있는 만큼만 잡고 부족을 알린다', () => {
    const result = resolveParsedMeal(
      { dishes: [{ name: '계란찜', ingredients: [{ spoken: '계란', amount: 15 }] }] },
      ITEMS,
      CONTEXT,
    );
    assert.equal(
      result.dishes[0].ingredients.reduce((sum, row) => sum + row.amount, 0),
      13,
    );
    assert.deepEqual(result.shortages, [{ name: '계란', available: 13, unit: 'count' }]);
  });

  it('여러 메뉴에 나눠 말해도 끼니 전체 재고를 넘지 않는다', () => {
    const result = resolveParsedMeal(
      {
        dishes: [
          { name: '계란찜', ingredients: [{ spoken: '계란', amount: 12 }] },
          { name: '계란말이', ingredients: [{ spoken: '계란', amount: 3 }] },
        ],
      },
      ITEMS,
      CONTEXT,
    );
    assert.equal(
      result.dishes[1].ingredients.reduce((sum, row) => sum + row.amount, 0),
      1,
    );
    assert.deepEqual(result.shortages, [{ name: '계란', available: 1, unit: 'count' }]);
  });

  it('무게 단위의 "다 썼어"는 남은 구매분을 모두 소진으로 둔다', () => {
    const result = resolveParsedMeal(
      {
        dishes: [{ name: '제육볶음', ingredients: [{ spoken: '돼지고기', depleted: true }] }],
      },
      ITEMS,
      CONTEXT,
    );
    assert.deepEqual(
      result.dishes[0].ingredients.map(({ batch_id, usage_status }) => ({
        batch_id,
        usage_status,
      })),
      [
        { batch_id: 'pork-old', usage_status: 'depleted' },
        { batch_id: 'pork-new', usage_status: 'depleted' },
      ],
    );
    assert.equal(result.stock[0].after, 0);
    assert.equal(result.stock[0].mode, 'deplete');
  });

  it('무게 단위를 썼다고만 말하면 오래된 구매분 하나에 남긴다', () => {
    const result = resolveParsedMeal(
      { dishes: [{ name: '제육볶음', ingredients: [{ spoken: '돼지고기' }] }] },
      ITEMS,
      CONTEXT,
    );
    assert.equal(result.dishes[0].ingredients.length, 1);
    assert.equal(result.dishes[0].ingredients[0].batch_id, 'pork-old');
    assert.equal(result.stock[0].mode, 'use');
  });

  it('후보가 여러 건이면 재료로 넣지 않고 고를 항목으로 남긴다', () => {
    const result = resolveParsedMeal(
      { dishes: [{ name: '시리얼', ingredients: [{ spoken: '우유', amount: 1 }] }] },
      ITEMS,
      CONTEXT,
    );
    assert.equal(result.dishes[0].ingredients.length, 0);
    assert.deepEqual(result.pendingIngredients, [
      {
        id: '시리얼:우유',
        dish_name: '시리얼',
        spoken: '우유',
        amount: 1,
        depleted: false,
        candidate_ids: ['seoul-milk', 'berry-milk'],
        reason: 'ambiguous',
      },
    ]);
  });

  it('못 찾은 재료가 있어도 메뉴는 남기고 찾은 재료는 연결한다', () => {
    const result = resolveParsedMeal(
      {
        dishes: [
          { name: '토스트', ingredients: [{ spoken: '식빵' }, { spoken: '계란', amount: 1 }] },
        ],
      },
      ITEMS,
      CONTEXT,
    );
    assert.equal(result.dishes[0].name, '토스트');
    assert.equal(result.dishes[0].ingredients.length, 1);
    assert.equal(result.pendingIngredients[0].reason, 'none');
    assert.deepEqual(result.pendingIngredients[0].candidate_ids, []);
  });

  it('찾았지만 재고가 없으면 재고 없음으로 구분한다', () => {
    const result = resolveParsedMeal(
      { dishes: [{ name: '두부조림', ingredients: [{ spoken: '두부', amount: 1 }] }] },
      ITEMS,
      CONTEXT,
    );
    assert.equal(result.dishes[0].ingredients.length, 0);
    assert.equal(result.pendingIngredients[0].reason, 'no_stock');
  });

  it('메뉴만 말하면 재고가 있는 품목만 미선택 추천으로 돌려준다', () => {
    const result = resolveParsedMeal(
      {
        dishes: [
          {
            name: '찌개',
            ingredients: [],
            suggested_ingredients: ['두부', '계란', '양파', '우유'],
          },
        ],
      },
      ITEMS,
      CONTEXT,
    );
    assert.equal(result.dishes[0].ingredients.length, 0);
    assert.deepEqual(result.suggestions, [
      { dish_name: '찌개', item_ids: ['egg', 'seoul-milk', 'berry-milk'] },
    ]);
    assert.deepEqual(result.stock, []);
  });

  it('외식 메뉴는 재료를 찾지 않고 추천도 만들지 않는다', () => {
    const result = resolveParsedMeal(
      {
        dishes: [
          {
            name: '계란찜',
            is_out: true,
            ingredients: [{ spoken: '계란' }],
            suggested_ingredients: ['계란'],
          },
        ],
      },
      ITEMS,
      CONTEXT,
    );
    assert.equal(result.dishes[0].isOut, true);
    assert.equal(result.dishes[0].ingredients.length, 0);
    assert.deepEqual(result.pendingIngredients, []);
    assert.deepEqual(result.suggestions, []);
  });

  it('금액이 있으면 외식비를 만들고 메뉴 이름을 채운다', () => {
    const result = resolveParsedMeal(
      {
        meal_type: 'lunch',
        dishes: [{ name: '김치찌개', is_out: true, ingredients: [] }],
        expense: { price: 15000, kind: 'delivery', store: '배달의민족', brand: null, menu: null },
      },
      ITEMS,
      CONTEXT,
    );
    assert.equal(result.mealKind, 'out');
    assert.deepEqual(result.expense, {
      kind: 'delivery',
      brand: '',
      name: '김치찌개',
      store: '배달의민족',
      price: 15000,
      date: '2026-11-03',
    });
  });

  it('금액이 0이거나 없으면 식비를 만들지 않는다', () => {
    const result = resolveParsedMeal({ expense: { price: 0 } }, ITEMS, CONTEXT);
    assert.equal(result.expense, null);
  });

  it('끼니가 없으면 지금 시각으로 짐작한다', () => {
    assert.equal(resolveParsedMeal({}, ITEMS, CONTEXT).type, 'lunch');
    assert.equal(resolveParsedMeal({}, ITEMS, { ...CONTEXT, now: '08:00' }).type, 'breakfast');
  });
});

describe('allocateIngredient', () => {
  it('이미 잡은 수량을 빼고 나눠 잡는다', () => {
    const usedByBatch = new Map([['egg-old', 3]]);
    const { rows } = allocateIngredient(
      ITEMS[1],
      { spoken: '계란', amount: 2, depleted: false },
      usedByBatch,
    );
    assert.deepEqual(
      rows.map(({ batch_id, amount }) => ({ batch_id, amount })),
      [{ batch_id: 'egg-new', amount: 2 }],
    );
    assert.equal(usedByBatch.get('egg-new'), 2);
  });
});

describe('guessMealType', () => {
  it('시간대별로 끼니를 고른다', () => {
    assert.equal(guessMealType('05:00'), 'breakfast');
    assert.equal(guessMealType('11:00'), 'lunch');
    assert.equal(guessMealType('16:00'), 'dinner');
    assert.equal(guessMealType('23:00'), 'snack');
    assert.equal(guessMealType('invalid'), 'snack');
  });
});

describe('extractJsonObject', () => {
  it('코드 블록 표시가 섞여도 JSON을 꺼낸다', () => {
    assert.deepEqual(extractJsonObject('```json\n{"date":"2026-11-03"}\n```'), {
      date: '2026-11-03',
    });
  });

  it('JSON이 없으면 오류를 낸다', () => {
    assert.throws(() => extractJsonObject('없음'));
  });
});
