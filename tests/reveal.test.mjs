import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const {revealPhase, revealValue, REVEAL_TOTAL} = await load('core/reveal');
const {TIMING} = await load('core/timing');
const {SLOTS} = await load('core/sound');

test('grade reveal: counts, then stamps, then settles', () => {
  assert.equal(revealPhase(0), 'count');
  assert.equal(revealPhase(TIMING.revealCount - 1), 'count');
  assert.equal(revealPhase(TIMING.revealCount), 'stamp');
  assert.equal(revealPhase(REVEAL_TOTAL), 'done');
  assert.ok(REVEAL_TOTAL <= 1600, 'the whole reveal stays short');
});

test('grade reveal: the counted number starts at 0, eases out and lands on the real move', () => {
  assert.equal(revealValue(-11.2, 0), 0);
  assert.equal(revealValue(-11.2, TIMING.revealCount), -11.2);
  assert.equal(revealValue(-11.2, TIMING.revealCount * 3), -11.2);
  const half = revealValue(-11.2, TIMING.revealCount / 2);
  assert.ok(half < -5.6 && half > -11.2, `eases out: ${half}`);
  // never goes past the real value on the way
  for (let ms = 0; ms <= TIMING.revealCount; ms += 50) assert.ok(revealValue(8.4, ms) <= 8.4);
});

test('grade reveal sounds have their slots', () => {
  assert.equal(SLOTS['grade-count'], 'tick');
  assert.equal(SLOTS['grade-stamp'], 'stamp');
  assert.equal(SLOTS['grade-hit'], 'reveal-hit');
  assert.equal(SLOTS['grade-miss'], 'reveal-miss');
});
