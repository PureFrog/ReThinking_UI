import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const {todayTasks, dayDone, nextGrade} = await load('core/today');
const {rankOf, xpOf, RANKS} = await load('core/rank');
const {recallOf} = await load('core/recall');
const {rankItem, GARDEN_ITEMS} = await load('content/garden-items');
const {LINES, say} = await load('content/analysts');

test('the quest board: the quiz, one journal, one cast; all three close the day', () => {
  const base = {quizDone: false, judgedToday: 0, fishedToday: 0};
  assert.deepEqual(todayTasks(base).map(t => t.id), ['quiz', 'judge', 'fish']);
  assert.equal(dayDone(todayTasks(base)), false);
  assert.deepEqual(todayTasks({quizDone: true, judgedToday: 1, fishedToday: 0}).map(t => t.done), [true, true, false]);
  assert.equal(dayDone(todayTasks({quizDone: true, judgedToday: 2, fishedToday: 1})), true);
});

test('the next grade to come back for is the nearest one still ahead', () => {
  const j = (id, day, name) => ({id, holdingId: 1, name, day, choice: 'hold', reason: 'r', confidence: 3, rate: 0});
  const list = [j('a', '2026-11-01', '가'), j('b', '2026-10-25', '나')];
  assert.deepEqual(nextGrade(list, [], '2026-11-13'), {name: '나', mark: 30, day: '2026-11-24', inDays: 11});
  // b's 30-day grade opened: a's comes next
  const graded = [{judgmentId: 'b', mark: 30, after: 0, hit: true, signalRight: null, points: 0, day: '2026-11-24'}];
  assert.equal(nextGrade(list, graded, '2026-11-25').name, '가');
  assert.equal(nextGrade([], [], '2026-11-13'), null);
});

test('titles come from judging experience, and each one after the first brings an item', () => {
  assert.equal(rankOf(0).name, RANKS[0].name);
  assert.equal(rankOf(0).next.left, RANKS[1].xp);
  assert.equal(rankOf(RANKS[1].xp).index, 1);
  assert.equal(rankOf(9999).next, null);
  assert.equal(xpOf({graded: 2, cases: 3, rewinds: 4}), 2 * 3 + 3 + 4);
  for (let k = 1; k < RANKS.length; k++) { const it = rankItem(k); assert.ok(it && !it.price, `rank ${k} item`); }
  assert.equal(GARDEN_ITEMS.filter(i => i.rank).length, RANKS.length - 1);
});

test('an analyst remembers the last call on their signal, and how it came out', () => {
  const j = {id: 'j1', holdingId: 7, name: 'POSCO홀딩스', day: '2026-08-01', choice: 'hold', reason: 'r', confidence: 4, rate: -6, analyst: 'tori', signalId: 's'};
  assert.equal(recallOf('tori', [j], [], '2026-08-20').kind, 'waiting');
  assert.equal(recallOf('tori', [j], [], '2026-08-20').days, 11);
  const g = {judgmentId: 'j1', mark: 30, after: -12, hit: false, signalRight: true, points: -7, day: '2026-08-31'};
  const r = recallOf('tori', [j], [g], '2026-09-02');
  assert.deepEqual(r, {kind: 'miss', name: 'POSCO홀딩스', choice: '홀드', mark: 30});
  assert.equal(recallOf('moa', [j], [g], '2026-09-02'), null);
  assert.equal(recallOf('tori', [j], [g], '2026-09-02', 99), null);
  // a judgment made today is not a memory yet
  assert.equal(recallOf('tori', [{...j, day: '2026-09-02'}], [], '2026-09-02'), null);
  const text = say(LINES.remember.tori[r.kind], 'x', r);
  assert.match(text, /POSCO홀딩스/);
  assert.doesNotMatch(text, /\{/);
});

test('a grade that already arrived does not hide the later one of the same judgment', () => {
  const j = {id: 'j2', holdingId: 6, name: '삼성전자', day: '2026-10-09', choice: 'watch', reason: 'r', confidence: 2, rate: 2};
  // its 30-day grade is due (not opened), its 90-day one is 55 days ahead
  assert.deepEqual(nextGrade([j], [], '2026-11-13'), {name: '삼성전자', mark: 90, day: '2027-01-07', inDays: 55});
});
