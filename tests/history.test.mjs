import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const {rateAt, holdingAt, lossDaysAt, lapseFrames, pinsAt, dayBack, LAPSE} = await load('core/history');
const {heldDays} = await load('core/model');
const {DEMO_HOLDINGS} = await load('content/demo-garden');

test('a holding\'s past runs from 0 on the day it was bought to today\'s return, the same every time', () => {
  for (const h of DEMO_HOLDINGS) {
    const held = heldDays(h.date);
    assert.equal(rateAt(h, 0), h.rate, h.name);
    assert.equal(Math.abs(rateAt(h, held)), 0, h.name);
    assert.equal(rateAt(h, held + 1), null, h.name);
    assert.equal(rateAt(h, Math.floor(held / 2)), rateAt(h, Math.floor(held / 2)));
  }
  // it wanders: not a straight line from 0 to today
  const h = DEMO_HOLDINGS.find(x => x.name === '현대차'), held = heldDays(h.date);
  const mid = rateAt(h, Math.floor(held / 2));
  assert.notEqual(mid, Math.round(h.rate * 0.5 * 10) / 10);
});

test('the holding as it stood then is younger, and absent before it was bought', () => {
  const h = DEMO_HOLDINGS.find(x => x.name === 'SK하이닉스');// bought 2026-08-01
  const then = holdingAt(h, 30);
  assert.equal(heldDays(then.date), heldDays(h.date) - 30);
  assert.equal(holdingAt(h, 365), null);
  const old = DEMO_HOLDINGS.find(x => x.name === 'NAVER');// bought 2025-06-01: there a year ago
  assert.ok(holdingAt(old, 365));
});

test('a year in weekly frames, oldest first, and the pins of judgments made by then', () => {
  const f = lapseFrames();
  assert.equal(f[0], LAPSE.days);
  assert.equal(f.at(-1), 0);
  assert.equal(f.length, 53);
  assert.equal(dayBack('2026-11-13', 7), '2026-11-06');
  const j = (id, holdingId, day) => ({id, holdingId, day});
  const list = [j('a', 7, '2026-08-13'), j('b', 6, '2026-10-09'), j('c', 6, '2026-10-20'), j('r', -1, '2026-01-01')];
  assert.deepEqual(pinsAt(list, '2026-09-01', [6, 7]), [7]);
  assert.deepEqual(pinsAt(list, '2026-11-13', [6, 7]).sort(), [6, 7]);
  assert.ok(lossDaysAt({...DEMO_HOLDINGS[3], rate: -24}, 0) >= 1);
});
