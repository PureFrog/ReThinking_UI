// The village's people walk round things (app/proto3d/places.ts npcStep, 피드백 2026-11-26 "NPC가 나무·바위 통과"):
// a walk to a point behind a rock gets there without ever going into it, and lamps line the paths without blocking them.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const P=await load('proto3d/places');

test('a walk past a rock goes round it and arrives', () => {
  const rock={x:0,z:0,r:1},p={x:-4,z:0.05};let inside=false;
  for(let i=0;i<400&&Math.hypot(p.x-4,p.z)>0.05;i++){P.npcStep(p,4,0,0.05,[rock]);if(Math.hypot(p.x,p.z)<1.29)inside=true}
  assert.ok(Math.hypot(p.x-4,p.z)<=0.05,`did not arrive: ${p.x},${p.z}`);assert.equal(inside,false);
});
test('a goal inside something (a seat by a tree) is reached at the end', () => {
  const tree={x:0,z:0,r:0.5},p={x:-3,z:0};
  for(let i=0;i<200;i++)P.npcStep(p,0.2,0,0.05,[tree]);
  assert.ok(Math.hypot(p.x-0.2,p.z)<0.06);
});
test('a goal just inside a wide solid (the cart): arrives, not circling its edge', () => {
  const cart={x:0,z:0,r:1.1},p={x:-5,z:0.3};
  for(let i=0;i<400;i++){if(Math.hypot(p.x-cart.x,p.z-cart.z)<=0.95)break;P.npcStep(p,0,0,0.05,[cart])}
  assert.ok(Math.hypot(p.x,p.z)<=0.95);
});
test('the lamps stand off the paths and out of the water', () => {
  assert.ok(P.LAMP_AT.length>=3&&P.LAMP_AT.length<=6);
  for(const l of P.LAMP_AT){assert.equal(P.inStream(l.x,l.z,0.5),false);for(const path of P.PATHS)for(const [x,z] of path)assert.ok(Math.hypot(x-l.x,z-l.z)>=0.75)}
});
