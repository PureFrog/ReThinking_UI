import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const {capsulesOf, capsuleLabel} = await load('core/capsule');

const j = (id, holdingId, day) => ({id, holdingId, name: 'x' + holdingId, day, choice: 'hold', reason: 'r', confidence: 3, rate: 0});
const g = (judgmentId, mark) => ({judgmentId, mark, after: 0, hit: true, signalRight: null, points: 0, day: '2026-11-13'});

test('one capsule per tree: the arrived grade first, otherwise the nearest one to come', () => {
  const list = [j('a', 1, '2026-10-01'), j('b', 1, '2026-11-10'), j('c', 2, '2026-11-01')];
  const caps = capsulesOf(list, [], '2026-11-13', [1, 2]);
  assert.equal(caps.length, 2);
  const t1 = caps.find(c => c.holdingId === 1);
  // a's 30-day grade (10-31) has arrived
  assert.deepEqual(t1, {holdingId: 1, judgmentId: 'a', mark: 30, day: '2026-10-31', due: true, inDays: -13});
  assert.equal(capsuleLabel(t1), '채점 완료');
  const t2 = caps.find(c => c.holdingId === 2);
  assert.equal(t2.due, false);
  assert.equal(t2.inDays, 18);
  assert.equal(capsuleLabel(t2), 'D-18');
});

test('an opened grade moves the capsule on to the next mark, and a tree no longer in the garden has none', () => {
  const list = [j('a', 1, '2026-10-01')];
  // 30 opened: the 90-day one is next (12-30, 47 days)
  const caps = capsulesOf(list, [g('a', 30)], '2026-11-13', [1]);
  assert.deepEqual(caps.map(c => [c.mark, c.inDays, c.due]), [[90, 47, false]]);
  // both opened: nothing left buried
  assert.deepEqual(capsulesOf(list, [g('a', 30), g('a', 90)], '2026-11-13', [1]), []);
  assert.deepEqual(capsulesOf(list, [], '2026-11-13', [5]), []);
  // a rewind round (holdingId -1) never gets one
  assert.deepEqual(capsulesOf([j('r', -1, '2026-10-01')], [], '2026-11-13', [1]), []);
});

test('the look-back judgment (dated 30 days back) is dug up right away', () => {
  const caps = capsulesOf([j('look', 3, '2026-10-14')], [], '2026-11-13', [3]);
  assert.equal(caps[0].due, true);
  assert.equal(caps[0].inDays, 0);
});
