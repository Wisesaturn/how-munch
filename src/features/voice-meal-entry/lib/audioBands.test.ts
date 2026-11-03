import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { toBandLevels } from './audioBands';

const SAMPLE_RATE = 48000;
const BIN_COUNT = 256;

describe('toBandLevels', () => {
  it('조용하면 모든 묶음이 0이다', () => {
    const levels = toBandLevels(new Uint8Array(BIN_COUNT).fill(20), SAMPLE_RATE, 5);
    assert.deepEqual(levels, [0, 0, 0, 0, 0]);
  });

  it('말소리 범위가 가득 차면 모든 묶음이 1이다', () => {
    const levels = toBandLevels(new Uint8Array(BIN_COUNT).fill(255), SAMPLE_RATE, 5);
    assert.deepEqual(levels, [1, 1, 1, 1, 1]);
  });

  it('낮은 소리만 크면 앞 묶음만 올라간다', () => {
    const data = new Uint8Array(BIN_COUNT);
    // 한 칸은 약 94Hz. 150~400Hz 부근만 세게 넣는다
    for (let bin = 1; bin <= 4; bin += 1) data[bin] = 255;
    const levels = toBandLevels(data, SAMPLE_RATE, 5);
    assert.ok(levels[0] > 0.9);
    assert.equal(levels[4], 0);
  });

  it('요청한 개수만큼 돌려준다', () => {
    assert.equal(toBandLevels(new Uint8Array(BIN_COUNT), SAMPLE_RATE, 7).length, 7);
  });
});
