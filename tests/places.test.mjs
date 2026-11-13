import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const {route, PLOTS, PLACES, inStream, streamZ, BRIDGE, WORLD, southOfStream} = await load('proto3d/places');
const {GARDEN_PLOTS} = await load('content/demo-garden');
const noPond = () => false;

test('fourteen plots, all on dry land inside the walkable ground, none on top of another', () => {
  assert.equal(PLOTS.length, 14);
  assert.equal(GARDEN_PLOTS, PLOTS.length);
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
  // across the stream: the near end of the bridge, the far end, then the tap
  const r = route({x: 3, z: 4}, {x: -2, z: 19}, noPond);
  assert.equal(r.length, 3);
  assert.equal(r[0].x, BRIDGE.x);
  assert.ok(!southOfStream(r[0].x, r[0].z) && southOfStream(r[1].x, r[1].z));
  assert.deepEqual(r[2], {x: -2, z: 19});
  // and back again
  const back = route({x: -2, z: 19}, {x: 0, z: 0}, noPond);
  assert.ok(southOfStream(back[0].x, back[0].z) && !southOfStream(back[1].x, back[1].z));
  // the water itself, or a pond, cannot be walked into
  assert.equal(route({x: 0, z: 0}, {x: 8, z: streamZ(8)}, noPond), null);
  assert.equal(route({x: 0, z: 0}, {x: 1, z: 1}, () => true), null);
  // far out: held at the edge of the walkable ground
  const far = route({x: 0, z: 0}, {x: 0, z: -80}, noPond);
  assert.ok(Math.abs(Math.hypot(far[0].x, far[0].z) - WORLD.walk) < 1e-9);
});
