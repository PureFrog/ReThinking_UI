import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const {letterOf, letterDue, prevMonth, monthLabel} = await load('core/letter');
const j = (id, day, conf, rebuttal) => ({id, holdingId: 1, name: 'POSCO홀딩스', day, choice: 'hold', reason: 'r', confidence: conf, rate: 0, rebuttal});
const g = (id, day, hit, points, after) => ({judgmentId: id, mark: 30, after, hit, signalRight: null, points, day});
const ctx = {cases: [{day: '2026-10-03'}, {day: '2026-11-01'}], rewinds: [{day: '2026-10-09'}], stamps: [{id: 'first-grade', day: '2026-10-20'}]};

test("last month's letter: what I judged, how it came out, my best and roughest call, no amounts", () => {
  const list = [j('a', '2026-09-20', 5, 'kept'), j('b', '2026-10-02', 2, 'accepted'), j('c', '2026-10-05', 4, 'kept')];
  const graded = [g('a', '2026-10-20', true, 20, 4.2), g('b', '2026-11-01', false, -2, -9), g('c', '2026-10-31', false, -7, -12.7)];
  const l = letterOf('2026-10', list, graded, ctx, id => id === 'first-grade' ? '첫 판정' : id);
  assert.equal(l.judged, 2);
  assert.equal(l.graded, 2);// a (Oct 20) and c (Oct 31); b's grade came in November
  assert.equal(l.hitRate, 50);
  assert.deepEqual(l.best, {name: 'POSCO홀딩스', choice: '홀드', mark: 30, after: 4.2, points: 20});
  assert.equal(l.roughest.points, -7);
  assert.equal(l.cases, 1); assert.equal(l.rewinds, 1);
  assert.deepEqual(l.stamps, ['첫 판정']);
  assert.equal(l.sure, 1); assert.equal(l.kept, 1); assert.equal(l.changed, 1);
  assert.doesNotMatch(JSON.stringify(l), /원|price|quantity/);
});

test('a letter comes once a new month has opened, only if there was something in it', () => {
  const l = letterOf('2026-10', [j('b', '2026-10-02', 2)], [], ctx, x => x);
  assert.equal(letterDue('2026-11-13', [], l), true);
  assert.equal(letterDue('2026-11-13', ['2026-10'], l), false);
  assert.equal(letterDue('2026-10-20', [], l), false);
  const empty = letterOf('2026-08', [], [], {cases: [], rewinds: [], stamps: []}, x => x);
  assert.equal(letterDue('2026-11-13', [], empty), false);
  assert.equal(prevMonth('2026-01'), '2025-12');
  assert.equal(monthLabel('2026-10'), '10월');
});
