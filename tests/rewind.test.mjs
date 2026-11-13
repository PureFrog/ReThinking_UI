import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const {playRewind, paidLeft, rewindTrack, REWIND} = await load('core/rewind');
const {rewindCase, MODEL_RIGHT} = await load('content/rewind');
const {hitOf, pointsOf} = await load('core/judgment');
const {MODEL_INFO} = await load('content/analysts');

test('되감기 cases: the same number gives the same case, every case has a note and a 30-day move', () => {
  assert.deepEqual(rewindCase(7), rewindCase(7));
  assert.notEqual(rewindCase(7).name + rewindCase(7).after, rewindCase(8).name + rewindCase(8).after);
  for (let n = 0; n < 200; n++) {
    const c = rewindCase(n);
    assert.ok(c.sig && c.sig.headline && c.sig.say, `case ${n} has a note`);
    assert.equal(MODEL_INFO[c.sig.model].analyst, c.sig.analyst);
    assert.equal(c.loss, c.sig.loss);
    assert.ok(Number.isFinite(c.after) && c.after > -30 && c.after < 20, `${c.after}`);
  }
});

test('되감기 cases: the models call a drop a bit more often than not, so following them is not a sure thing', () => {
  const loss = Array.from({length: 400}, (_, n) => rewindCase(n)).filter(c => c.loss);
  const right = loss.filter(c => c.after <= -5).length / loss.length;
  assert.ok(right > MODEL_RIGHT - 0.1 && right < MODEL_RIGHT + 0.1, `${right}`);
});

test('되감기 rounds: graded by the real rules, and only the first few a day pay', () => {
  const c = {id: 'rewind-1', after: -12.4, loss: true};
  let rounds = [];
  for (let i = 0; i < REWIND.paidPerDay + 2; i++) {
    const r = playRewind(c, 'review', 4, '2026-11-12', rounds);
    assert.equal(r.hit, hitOf('review', -12.4));
    assert.equal(r.points, pointsOf(r.hit, 4));
    assert.equal(r.signalRight, true);
    assert.equal(r.paid, i < REWIND.paidPerDay);
    rounds = [...rounds, r];
  }
  assert.equal(paidLeft(rounds, '2026-11-12'), 0);
  assert.equal(paidLeft(rounds, '2026-11-13'), REWIND.paidPerDay);
  const t = rewindTrack(rounds);
  assert.equal(t.rounds, REWIND.paidPerDay + 2);
  assert.equal(t.hitRate, 100);
  assert.deepEqual(rewindTrack([]), {rounds: 0, hits: 0, hitRate: null, calibration: null});
  // a gain the auditor doubted is not a loss signal: no model call to grade
  assert.equal(playRewind({id: 'x', after: 3, loss: false}, 'hold', 3, 'd', []).signalRight, null);
});
