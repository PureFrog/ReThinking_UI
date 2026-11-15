import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const {rootsOf, rootRows, rootsSay, toneOf} = await load('core/roots');
const {mockHealth} = await load('content/health');
const {mockSignals} = await load('content/signals');
const {DEMO_HOLDINGS} = await load('content/demo-garden');
const {LINES, say} = await load('content/analysts');

const healthy = {fscore: 8, ohlson: 2, debt: 60}, weak = {fscore: 2, ohlson: 17, debt: 214};
test('strength is roots: a healthy company has more and thicker roots, no spots, no stone', () => {
  const a = rootsOf(healthy), b = rootsOf(weak);
  assert.ok(a.count > b.count && a.thick > b.thick, JSON.stringify({a, b}));
  assert.equal(a.spots, 0);
  assert.equal(a.stone, 0);
  assert.ok(b.spots >= 8, `spots ${b.spots}`);
  assert.ok(b.stone > 0.5, `stone ${b.stone}`);
  // ends: 0 points still has a few roots, 9 the most
  assert.equal(rootsOf({fscore: 0, ohlson: 0, debt: 0}).count, 3);
  assert.equal(rootsOf({fscore: 9, ohlson: 0, debt: 0}).count, 8);
  assert.equal(rootsOf({fscore: 5, ohlson: 99, debt: 999}).spots, 12);
  assert.equal(rootsOf({fscore: 5, ohlson: 99, debt: 999}).stone, 1);
});

test('the rows say the plain word first, then the model, then the number', () => {
  const rows = rootRows(weak);
  assert.deepEqual(rows.map(r => r.word), ['회사 체력', '부도 위험', '빚 부담']);
  assert.deepEqual(rows.map(r => r.model), ['F-score', '올슨', '부채비율']);
  assert.deepEqual(rows.map(r => r.value), ['2/9', '17%', '214%']);
  assert.deepEqual(rows.map(r => r.tone), ['weak', 'weak', 'weak']);
  assert.deepEqual(rootRows(healthy).map(r => r.tone), ['good', 'good', 'good']);
  assert.equal(toneOf('fscore', 4), 'mid');
  assert.equal(toneOf('debt', 150), 'mid');
});

test('the mock reads the research note when there is one, and is steady without one', () => {
  const sigs = mockSignals(DEMO_HOLDINGS, '2026-11-13');
  const steel = DEMO_HOLDINGS.find(h => h.name === 'POSCO홀딩스');
  const h = mockHealth(steel, sigs.find(s => s.holdingId === steel.id));
  assert.deepEqual(h, {fscore: 3, ohlson: 17, debt: 214});
  const chip = DEMO_HOLDINGS.find(h => h.name === 'SK하이닉스');
  assert.equal(mockHealth(chip, sigs.find(s => s.holdingId === chip.id)).debt, 110);
  // no note: steady per name, weaker in the red
  const wind = DEMO_HOLDINGS.find(h => h.name === '한화에어로스페이스');
  assert.deepEqual(mockHealth(wind, null), mockHealth(wind, null));
  assert.ok(mockHealth(wind, null).fscore >= 6);
  assert.ok(mockHealth({...wind, rate: -30}, null).fscore <= 4);
});

test("tori's line has the number in it and never says sell", () => {
  for (const hh of [healthy, weak, {fscore: 5, ohlson: 8, debt: 130}]) {
    const {main, extra} = rootsSay(hh);
    const vars = {name: 'POSCO홀딩스', f: hh.fscore, o: hh.ohlson, d: hh.debt};
    for (let s = 0; s < 4; s++) {
      const text = say(LINES.roots[main], s, vars) + (extra ? ' ' + say(LINES.roots[extra], s, vars) : '');
      assert.match(text, new RegExp(String(hh.fscore)));
      assert.doesNotMatch(text, /팔아|사라|매도|매수|오를|떨어질/);
      assert.doesNotMatch(text, /\{/);
    }
  }
  assert.deepEqual(rootsSay(weak), {main: 'weak', extra: 'spots'});
  assert.deepEqual(rootsSay(healthy), {main: 'good', extra: null});
  assert.deepEqual(rootsSay({fscore: 6, ohlson: 3, debt: 200}), {main: 'good', extra: 'stone'});
});
