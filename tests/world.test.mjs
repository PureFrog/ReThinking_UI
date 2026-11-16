// The garden spread out (2026-11-16 "맵이 조금 더 넓게", app/core/world.ts): places move SPREAD times farther from the
// middle, the things that belong to them keep their distance, and everything stays inside the walk.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const W=await load('core/world');
const P=await load('proto3d/places');
const R=await load('core/routine');

test('an anchor moves SPREAD times out; a point beside it keeps its offset', () => {
  const [hx,hz]=W.spread(-5.5,-3);
  assert.ok(Math.abs(hx-(-5.5*W.SPREAD))<1e-9&&Math.abs(hz-(-3*W.SPREAD))<1e-9);
  const [dx,dz]=W.spread(-4.2,-1);// the house door
  assert.ok(Math.abs((dx-hx)-1.3)<1e-9&&Math.abs((dz-hz)-2)<1e-9);
});

test('places are farther apart than before, and each walk point stays the same step in front of its place', () => {
  const home=P.place('home'),farm=P.place('farm');
  assert.ok(Math.hypot(home.x-farm.x,home.z-farm.z)>13);// was ~10.6
  assert.ok(Math.abs((home.walk.x-home.x)-1.2)<1e-9&&Math.abs((home.walk.z-home.z)-2.2)<1e-9);
  for(const p of P.PLACES)assert.ok(Math.hypot(p.walk.x,p.walk.z)<P.WORLD.walk,p.id);
});

test("the analysts' spots and paths stay walkable and dry", () => {
  for(const s of [...Object.values(R.SPOTS).flat(),R.MEET]){
    assert.ok(Math.hypot(s.x,s.z)<P.WORLD.walk,s.id);
    assert.ok(!P.inStream(s.x,s.z),s.id);
  }
  for(const l of P.PATHS)for(const [x,z] of l)assert.ok(Math.hypot(x,z)<P.WORLD.walk);
  // the bridge still sits on the stream
  assert.ok(Math.abs(P.streamZ(P.BRIDGE.x)-W.spread(-2,13.13)[1])<0.05);
});
