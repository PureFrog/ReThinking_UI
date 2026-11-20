import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load} from './load-app.mjs';
const {WEAR, PALETTES, DEFAULT_LOOK, isOpen, fitLook, howTo, SLOTS} = await load('core/wardrobe');
const {STAMPS, newStamps} = await load('core/stamps');

const fresh = {rank: 0, stamps: [], trust: {tori: 0, moa: 0, luon: 0}, bought: []};
test('every piece has its model file, a way to get it, and the start look is wearable at once', () => {
  for (const w of WEAR) assert.ok(fs.existsSync(new URL(`../public/models/explorer/${w.id}.glb`, import.meta.url)), w.id);
  assert.ok(fs.existsSync(new URL('../public/models/explorer/explorer.glb', import.meta.url)));
  for (const s of SLOTS) assert.ok(WEAR.some(w => w.slot === s.id), s.id);
  assert.deepEqual(fitLook(DEFAULT_LOOK, fresh), DEFAULT_LOOK);
  // the stamps a piece asks for exist
  for (const w of WEAR) if (w.unlock.kind === 'stamp') assert.ok(STAMPS.some(s => s.id === w.unlock.id), w.id);
  for (const p of PALETTES) if (p.unlock.kind === 'stamp') assert.ok(STAMPS.some(s => s.id === p.unlock.id), p.id);
});

test('locked pieces open by title, stamp, trust or buying, and a look falls back until they do', () => {
  const lamp = WEAR.find(w => w.id === 'hat_lamp'), brief = WEAR.find(w => w.id === 'bag_brief'), rain = WEAR.find(w => w.id === 'coat_rain');
  assert.equal(isOpen(lamp.unlock, fresh, lamp.id), false);
  assert.equal(isOpen(lamp.unlock, {...fresh, stamps: ['sure-hit']}, lamp.id), true);
  assert.equal(isOpen(brief.unlock, {...fresh, trust: {tori: 2, moa: 0, luon: 0}}, brief.id), true);
  assert.equal(isOpen(rain.unlock, {...fresh, bought: ['coat_rain']}, rain.id), true);
  const wanted = {coat: 'coat_rain', hat: 'hat_lamp', bag: 'bag_brief', tool: 'tool_trowel', palette: 'seal'};
  assert.deepEqual(fitLook(wanted, fresh), {coat: 'coat_vest', hat: null, bag: null, tool: null, palette: 'moss'});
  const names = {rank: () => '기록자', stamp: id => STAMPS.find(s => s.id === id).name, who: () => '토리'};
  assert.equal(howTo(lamp.unlock, names), "업적 '확신 5 적중'");
  assert.equal(howTo(rain.unlock, names), '6,000원에 사기');
});

test('stamps come from the work of judging, each once', () => {
  const ctx = {judgments: 1, graded: [{hit: true, confidence: 5}], bestStreak: 0, rewinds: 0, cases: 0, daysDone: 0, seen: {cutaway: 0, bury: 1}, calibration: 90};
  assert.deepEqual(newStamps(ctx, []).sort(), ['capsule', 'first-grade', 'first-judgment', 'sure-hit']);
  assert.deepEqual(newStamps(ctx, ['capsule', 'first-grade', 'first-judgment', 'sure-hit']), []);
  assert.ok(newStamps({...ctx, graded: [{hit: false, confidence: 1}]}, []).includes('humble'));
  // calibration needs enough grades behind it
  assert.ok(!newStamps(ctx, []).includes('calibrated'));
  assert.ok(newStamps({...ctx, graded: Array(5).fill({hit: true, confidence: 4})}, []).includes('calibrated'));
});
