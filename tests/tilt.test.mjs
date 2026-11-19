import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const {tiltOffset, TILT} = await load('core/tilt');
const rest = {beta: 40, gamma: 0};
test('tilting from how the phone was held moves the view, a still hand does not, and it stops at the edge', () => {
  assert.deepEqual(tiltOffset(40, 0, rest), {x: 0, y: 0});
  assert.deepEqual(tiltOffset(41, -1, rest), {x: 0, y: 0});// inside the dead zone
  const t = tiltOffset(40 + TILT.range, -TILT.range, rest);
  assert.equal(t.y, 1);
  assert.equal(t.x, -1);
  assert.equal(tiltOffset(90, 80, rest).x, 1);// clamped
  const half = tiltOffset(40, 12, rest).x;
  assert.ok(half > 0.3 && half < 0.7, String(half));
  assert.deepEqual(tiltOffset(null, null, rest), {x: 0, y: 0});
});
