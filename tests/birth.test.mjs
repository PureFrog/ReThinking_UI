import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const {birthPlan, treeAt, stageAt, growScale, easeOutBack, stateOn} = await load('core/birth');

test('four holdings are born within 8 seconds, camera look and analysts included', () => {
  const p = birthPlan(4, true);
  assert.ok(p.total <= 8000, `total ${p.total}`);
  assert.ok(p.orbit > 0 && p.walk > 0);
  // a big garden keeps the same length (the starts come closer)
  assert.ok(birthPlan(7, true).total <= 8000);
  assert.ok(birthPlan(7, true).stagger < p.stagger);
  // the short one (second time, trees added later) has no card, no look round
  const s = birthPlan(4, false);
  assert.equal(s.card, 0);
  assert.equal(s.orbit, 0);
  assert.ok(s.total < 1600, `short ${s.total}`);
  assert.equal(birthPlan(0, true).trees, 0);
});

test('each tree goes card → crack → grow → settle → done, one after another', () => {
  const p = birthPlan(3, true);
  const order = [];
  for (let ms = 0; ms <= p.trees + 10; ms += 20) { const ph = treeAt(p, 1, ms).phase; if (order.at(-1) !== ph) order.push(ph); }
  assert.deepEqual(order, ['wait', 'card', 'crack', 'grow', 'settle', 'done']);
  assert.equal(treeAt(p, 0, 0).phase, 'card');
  assert.equal(treeAt(p, 2, p.stagger * 2 - 1).phase, 'wait');
  assert.equal(stageAt(p, 0), 'trees');
  assert.equal(stageAt(p, p.orbitAt + 1), 'orbit');
  assert.equal(stageAt(p, p.orbitAt + p.orbit + 1), 'walk');
  assert.equal(stageAt(p, p.total), 'done');
  assert.equal(stageAt(birthPlan(2, false), 10), 'trees');
});

test('a tree overshoots a little as it shoots up and settles at its size', () => {
  let max = 0;
  for (let k = 0; k <= 1; k += 0.01) max = Math.max(max, growScale('grow', k));
  assert.ok(max > 1.05 && max < 1.3, `overshoot ${max}`);
  assert.equal(Math.round(easeOutBack(1) * 1000) / 1000, 1);
  assert.equal(growScale('card', 0.5), 0);
  assert.equal(growScale('done', 1), 1);
  assert.equal(stateOn('grow'), false);
  assert.equal(stateOn('settle'), true);
});
