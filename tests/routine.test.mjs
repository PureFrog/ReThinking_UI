import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const {routineOf, partOf, SPOTS, ROUTINE, MEET} = await load('core/routine');
const {CHATS, chatOf} = await load('content/routine-lines');
const {route} = await load('proto3d/places');
const none = {tori: [], moa: [], luon: []};

test('a signal comes first, then luon waits at an arrived grade, then the day', () => {
  const r = routineOf(10 * 60, {tori: [7], moa: [], luon: []}, 6);
  assert.deepEqual(r.tori, {kind: 'signal', holdingId: 7});
  // several signals: over the morning she looks at each of them
  const seen = new Set();for (let m = 9 * 60; m < 10 * 60; m += 4) seen.add(routineOf(m, {tori: [7, 4, 1], moa: [], luon: []}, null).tori.holdingId);
  assert.deepEqual([...seen].sort(), [1, 4, 7]);
  assert.deepEqual(r.luon, {kind: 'grade', holdingId: 6});
  assert.equal(r.moa.kind, 'spot');
  assert.ok(SPOTS.moa.some(s => s.id === r.moa.spot.id) || r.moa.spot.id === 'meet');
});

test('the day moves them between their own spots, and at night they are home', () => {
  assert.equal(partOf(8), 'morning'); assert.equal(partOf(13), 'day'); assert.equal(partOf(19), 'evening'); assert.equal(partOf(2), 'night');
  for (const w of ['tori', 'moa', 'luon']) assert.equal(routineOf(23 * 60, none, null)[w].kind, 'home');
  // over an afternoon each one visits more than one place, always one of theirs (or the shared meeting spot)
  for (const w of ['tori', 'moa', 'luon']) {
    const seen = new Set();
    for (let m = 11 * 60; m < 17 * 60; m += ROUTINE.swapMinutes) { const x = routineOf(m, none, null)[w]; seen.add(x.spot.id); assert.ok(SPOTS[w].some(s => s.id === x.spot.id) || x.spot.id === MEET.id) }
    assert.ok(seen.size >= 2, `${w} ${[...seen]}`);
  }
  // the same minute is the same answer (everyone sees the same garden)
  assert.deepEqual(routineOf(14 * 60 + 9, none, null), routineOf(14 * 60 + 9, none, null));
});

test('every few swaps two free ones meet and have something to say to each other', () => {
  let met = 0;
  for (let m = 6 * 60; m < 21 * 60; m += ROUTINE.swapMinutes) {
    const r = routineOf(m, none, null), pair = ['tori', 'moa', 'luon'].filter(w => r[w].with);
    if (!pair.length) continue;
    met++;
    assert.equal(pair.length, 2);
    const [a, b] = pair; assert.equal(r[a].with, b); assert.equal(r[b].with, a);
    const c = chatOf(a, r[a].with, m);
    assert.ok(c.a && c.b);
  }
  assert.ok(met > 10);
  // nothing in the talk tells anyone to buy or sell, or guesses a price
  for (const list of Object.values(CHATS)) for (const [x, y] of list) for (const t of [x, y]) assert.doesNotMatch(t, /팔아|사라|매도|매수|오를 거|떨어질 거/);
});

test('every spot can be walked to from the middle (the bridge for the square)', () => {
  for (const w of ['tori', 'moa', 'luon']) for (const s of SPOTS[w]) assert.ok(route({x: 0, z: 0}, s, () => false), `${w} ${s.id}`);
});
