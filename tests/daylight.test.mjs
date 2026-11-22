import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const {daylightOf, mixHex} = await load('core/daylight');
test('full day at noon, night after nine, warm at dawn and dusk', () => {
  assert.deepEqual(daylightOf(12 * 60), {day: 1, warm: 0, night: 0});
  assert.equal(daylightOf(23 * 60).day, 0);
  assert.equal(daylightOf(2 * 60).night, 1);
  assert.ok(daylightOf(18.6 * 60).warm > 0.95);
  assert.ok(daylightOf(6.2 * 60).warm > 0.95);
  const d = daylightOf(19 * 60);
  assert.ok(d.day > 0 && d.day < 1);
  // the day only grows through the morning
  let last = -1;
  for (let m = 4 * 60; m <= 8 * 60; m += 10) { const v = daylightOf(m).day; assert.ok(v >= last); last = v; }
});
test('colours mix', () => {
  assert.equal(mixHex('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(mixHex('#102030', '#102030', 0.3), '#102030');
  assert.equal(mixHex('#000000', '#ff0000', 2), '#ff0000');
});
