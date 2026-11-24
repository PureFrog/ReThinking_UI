import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const {route, PLOTS, PLACES, inStream, streamZ, BRIDGE, WORLD, southOfStream} = await load('proto3d/places');
const {GARDEN_PLOTS} = await load('content/demo-garden');
const noPond = () => false;

test('plots: eighteen open at first (9 a field) (more with land, core/land.ts), all on dry land inside the walkable ground, none on top of another', () => {
  assert.equal(PLOTS.length, 36);
  assert.equal(GARDEN_PLOTS, 18);
  for (const [x, z] of PLOTS) {
    assert.ok(Math.hypot(x, z) < WORLD.walk, `${x},${z}`);
    assert.ok(!inStream(x, z, 1), `${x},${z} in the stream`);
  }
  for (let i = 0; i < PLOTS.length; i++) for (let j = i + 1; j < PLOTS.length; j++)
    assert.ok(Math.hypot(PLOTS[i][0] - PLOTS[j][0], PLOTS[i][1] - PLOTS[j][1]) > 2, `${i} and ${j} too close`);
  // every place stands within the ground and its stop is walkable
  for (const p of PLACES) assert.ok(route({x: 0, z: 2.5}, p.walk, noPond), p.id);
});

test('walking: straight on one side, over the bridge to cross, never into the water, held at the edge', () => {
  assert.deepEqual(route({x: 0, z: 2}, {x: 4, z: -3}, noPond), [{x: 4, z: -3}]);
  // across the stream: straight onto the bridge's near end, over to the far end, straight off, then the tap
  // (피드백 2026-11-24 "다리가 통과돼": never across a rail)
  const r = route({x: 3, z: 4}, {x: -2, z: 22}, noPond);
  assert.equal(r.length, 5);
  for (const q of r.slice(0, 4)) assert.equal(q.x, BRIDGE.x);
  assert.ok(!southOfStream(r[1].x, r[1].z) && southOfStream(r[2].x, r[2].z));
  assert.deepEqual(r[4], {x: -2, z: 22});
  // and back again
  const back = route({x: -2, z: 22}, {x: 0, z: 0}, noPond);
  assert.ok(southOfStream(back[1].x, back[1].z) && !southOfStream(back[2].x, back[2].z));
  // beside the bridge, inside its length: first a step straight out, then onto it
  const mid = streamZ(BRIDGE.x), side = route({x: BRIDGE.x + 2, z: mid - 1.5}, {x: -2, z: 22}, noPond);
  assert.equal(side[0].x, BRIDGE.x + 2);assert.ok(Math.abs(side[0].z - mid) > BRIDGE.half);
  // the water itself, or a pond, cannot be walked into
  assert.equal(route({x: 0, z: 0}, {x: 8, z: streamZ(8)}, noPond), null);
  assert.equal(route({x: 0, z: 0}, {x: 1, z: 1}, () => true), null);
  // far out: held at the edge of the walkable ground
  const far = route({x: 0, z: 0}, {x: 0, z: -80}, noPond);
  assert.ok(Math.abs(Math.hypot(far[0].x, far[0].z) - WORLD.walk) < 1e-9);
});
