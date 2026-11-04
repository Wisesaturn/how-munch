import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { type ParsedPurchase } from './parseExtras';
import { buildVoiceRecordPayload, type VoiceRecordPayloadInput } from './voiceRecordPayload';

const PURCHASE: ParsedPurchase = {
  name: '양파',
  brand: '',
  category_id: 'c',
  unit: 'count',
  count: 2,
  price: 1000,
  fridge_item_id: null,
};
const INPUT: VoiceRecordPayloadInput = {
  householdId: 'h',
  date: '2026-11-04',
  type: 'dinner',
  purchaseStore: '마트',
  dishes: [],
  purchases: [],
  purchaseLinks: [],
  stockUpdates: [],
  expense: null,
};

describe('buildVoiceRecordPayload', () => {
  it('품목을 고르지 않은 장보기는 빼고 메뉴 연결 번호를 다시 매긴다', () => {
    const payload = buildVoiceRecordPayload({
      ...INPUT,
      purchases: [{ ...PURCHASE, name: '우유', candidate_ids: ['a', 'b'] }, PURCHASE],
      purchaseLinks: [
        { dish_name: '시리얼', purchase_index: 0, amount: 1, usage_status: 'used' },
        { dish_name: '볶음', purchase_index: 1, amount: 1, usage_status: 'used' },
      ],
    });
    assert.deepEqual(
      payload.purchases.map((purchase) => purchase.name),
      ['양파'],
    );
    assert.deepEqual(payload.purchaseLinks, [
      { dish_name: '볶음', purchase_index: 0, amount: 1, usage_status: 'used' },
    ]);
  });

  it('장보기를 끄면 메뉴 연결도 뺀다', () => {
    const payload = buildVoiceRecordPayload({
      ...INPUT,
      purchases: null,
      purchaseLinks: [{ dish_name: '볶음', purchase_index: 0, amount: 1, usage_status: 'used' }],
    });
    assert.deepEqual(payload.purchaseLinks, []);
  });

  it('식단을 끄면 장보기는 남기고 메뉴 연결만 뺀다', () => {
    const payload = buildVoiceRecordPayload({
      ...INPUT,
      dishes: null,
      purchases: [PURCHASE],
      purchaseLinks: [{ dish_name: '볶음', purchase_index: 0, amount: 1, usage_status: 'used' }],
    });
    assert.equal(payload.purchases.length, 1);
    assert.deepEqual(payload.purchaseLinks, []);
  });

  it('품목별 가게가 없으면 장보기 가게를 쓰고 편집한 유통기한을 구매분으로 넘긴다', () => {
    const payload = buildVoiceRecordPayload({
      ...INPUT,
      purchases: [{ ...PURCHASE, expiry_date: null }],
    });
    assert.equal(payload.purchases[0].store, '마트');
    assert.deepEqual(payload.purchases[0].batches, [{ quantity: 2, expiry_date: null }]);
  });

  it('식당 외식비는 플랫폼을 비우고 빈 메뉴와 메모는 null로 보낸다', () => {
    const payload = buildVoiceRecordPayload({
      ...INPUT,
      expense: {
        kind: 'restaurant',
        brand: ' 식당 ',
        name: ' ',
        store: '배민',
        price: 1000,
        date: '2026-11-04',
      },
    });
    assert.deepEqual(payload.expense, {
      kind: 'restaurant',
      brand: '식당',
      name: null,
      store: null,
      price: 1000,
      date: '2026-11-04',
      memo: null,
    });
  });
});
