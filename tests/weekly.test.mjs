import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const {weekGoals, weekStart, GOALS} = await load('core/weekly');
const empty = {judgments: [], graded: [], cases: [], rewinds: [], daysDone: []};
test("the week's three goals are the same for everyone, counted from this week only", () => {
  assert.equal(weekStart('2026-11-13'), '2026-11-09');// a Friday → its Monday
  assert.equal(weekStart('2026-11-09'), '2026-11-09');
  const w = weekGoals('2026-11-13', empty);
  assert.equal(w.goals.length, 3);
  assert.equal(new Set(w.goals.map(g => g.id)).size, 3);
  assert.deepEqual(weekGoals('2026-11-10', empty).goals.map(g => g.id), w.goals.map(g => g.id));
  assert.notDeepEqual(weekGoals('2026-11-20', empty).goals.map(g => g.id), w.goals.map(g => g.id));
  assert.equal(w.done, false);
  // filled in from this week's work, last week's does not count
  const all = {judgments: [{day: '2026-11-10', confidence: 1, rebuttal: 'accepted'}, {day: '2026-11-11', confidence: 2}, {day: '2026-11-12', confidence: 3}, {day: '2026-11-02', confidence: 1}],
    graded: [{day: '2026-11-10'}, {day: '2026-11-12'}], cases: [{day: '2026-11-09'}, {day: '2026-11-10'}, {day: '2026-11-13'}],
    rewinds: [{day: '2026-11-10'}, {day: '2026-11-10'}, {day: '2026-11-11'}], daysDone: ['2026-11-10', '2026-11-12']};
  const full = weekGoals('2026-11-13', all);
  assert.equal(full.done, true, JSON.stringify(full.goals));
  for (const g of GOALS) assert.doesNotMatch(g.text, /수익|팔|사기|매수|매도/);
});
