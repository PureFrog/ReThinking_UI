import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const {choiceShare, byConfidence, habitOf} = await load('core/profile');
const j = (id, choice, confidence) => ({id, holdingId: 1, name: 'x', day: '2026-10-01', choice, reason: 'r', confidence, rate: 0});
const g = (id, hit) => ({judgmentId: id, mark: 30, after: 0, hit, signalRight: null, points: 0, day: '2026-11-01'});

test('how often I chose each, and how right I was at each confidence', () => {
  const list = [j('a', 'hold', 5), j('b', 'hold', 5), j('c', 'review', 2), j('d', 'watch', 3)];
  assert.deepEqual(choiceShare(list), {hold: 0.5, review: 0.25, watch: 0.25});
  const b = byConfidence(list, [g('a', true), g('b', false), g('c', true)]);
  assert.deepEqual(b.find(x => x.c === 5), {c: 5, n: 2, rate: 50});
  assert.deepEqual(b.find(x => x.c === 2), {c: 2, n: 1, rate: 100});
  assert.deepEqual(b.find(x => x.c === 1), {c: 1, n: 0, rate: null});
});

test('the habit name comes from my own record: sure but often wrong reads bold, mostly holding reads as holding on', () => {
  assert.equal(habitOf([j('a', 'hold', 3)], []).name, '새내기 관찰자');
  const list = [j('a', 'hold', 5), j('b', 'hold', 5), j('c', 'hold', 4), j('d', 'review', 3)];
  const h = habitOf(list, [g('a', true), g('b', false), g('c', false)]);
  assert.equal(h.name, '과감한 버팀꾼');
  assert.match(h.why, /적중 33%/);
  const careful = habitOf([j('a', 'watch', 1), j('b', 'watch', 2), j('c', 'watch', 2)], [g('a', true), g('b', true)]);
  assert.equal(careful.name, '신중한 관망꾼');
  assert.doesNotMatch(JSON.stringify([h, careful]), /수익|원\b/);
});
