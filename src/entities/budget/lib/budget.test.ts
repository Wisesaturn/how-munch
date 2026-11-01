import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isBudgetList } from './budget';

const BUDGET = {
  id: 'budget-1',
  household_id: 'household-1',
  year_month: '2026-11',
  scope: 'total',
  amount: 600000,
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
};

describe('isBudgetList', () => {
  it('Budget 목록과 빈 목록을 허용한다', () => {
    assert.equal(isBudgetList([BUDGET]), true);
    assert.equal(isBudgetList([]), true);
  });

  it('형태가 다르면 거부한다', () => {
    assert.equal(isBudgetList(null), false);
    assert.equal(isBudgetList(BUDGET), false);
    assert.equal(isBudgetList([{ ...BUDGET, scope: 'unknown' }]), false);
    assert.equal(isBudgetList([{ ...BUDGET, amount: '600000' }]), false);
    assert.equal(isBudgetList([{ id: 'budget-1' }]), false);
  });
});
