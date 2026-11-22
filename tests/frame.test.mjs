import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const {frameFor} = await load('core/frame');

const F = [
  {aspect:2.16,fov:42,dist:19,turn:0,pitch:0.6,blur:0.15,lead:0},
  {aspect:0.46,fov:52,dist:27,turn:1.05,pitch:0.4,blur:0.09,lead:3.5},
  {aspect:1.33,fov:46,dist:23.5,turn:0,pitch:0.54,blur:0.17,lead:0},
];

test('camera framing: each screen shape gets its own frame, in any order', () => {
  assert.deepEqual(frameFor(F, 0.46), {fov:52,dist:27,turn:1.05,pitch:0.4,blur:0.09,lead:3.5});
  assert.deepEqual(frameFor(F, 1.33), {fov:46,dist:23.5,turn:0,pitch:0.54,blur:0.17,lead:0});
  assert.equal(frameFor(F, 2.16).dist, 19);
});

test('camera framing: shapes between frames blend, shapes past the ends keep the nearest end', () => {
  const mid = frameFor(F, (0.46 + 1.33) / 2);
  assert.ok(Math.abs(mid.dist - 25.25) < 1e-9);
  assert.ok(Math.abs(mid.turn - 0.525) < 1e-9);
  assert.deepEqual(frameFor(F, 0.3), frameFor(F, 0.46));
  assert.deepEqual(frameFor(F, 3), frameFor(F, 2.16));
  // a zero-height screen (aspect NaN or Infinity) never breaks the camera
  assert.equal(frameFor(F, NaN).dist, 27);
  assert.equal(frameFor([], 1).fov, 46);
});
