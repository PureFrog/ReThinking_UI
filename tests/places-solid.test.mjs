// Buildings are solid (app/proto3d/places.ts solids/pushOut, 2026-11-16 "캐릭터가 건물을 통과"): walking straight
// through the house ends at its edge; every place's walk point stays outside; bought buildings join.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const P=await load('proto3d/places');

test('walking through the house stops at its wall', () => {
  const walls=P.solids(null),home=P.place('home'),p={x:home.x-6,z:home.z};
  for(let i=0;i<120;i++){p.x+=0.1;P.pushOut(p,walls)}
  const d=Math.hypot(p.x-home.x,p.z-home.z);assert.ok(d>=2.1,`inside the house: ${d}`);
});

test("each place's walk point is outside every wall", () => {
  const walls=P.solids({land:[],buildings:['greenhouse','silo','windmill'],cities:['seoul','tokyo','paris','london','newyork']});
  for(const pl of P.PLACES){const q={...pl.walk};assert.equal(P.pushOut(q,walls),false,`${pl.id} walk point is inside a wall`)}
});

test('bought buildings and landmarks become walls', () => {
  assert.equal(P.solids({land:[],buildings:[],cities:[]}).length,4);// house, library, the two shops (the 관측소 is gone, 2026-11-20)
  assert.equal(P.solids({land:[],buildings:['silo'],cities:['paris']}).length,6);
});
