// Fishing with 나루 (core/fishing.ts): three casts a day, the tap window, what comes up and what it pays.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const F=await load('core/fishing');
const C=await load('content/fish');
const seq=(...xs)=>{let i=0;return ()=>xs[i++%xs.length]};

test('three casts a day, a new day starts again; the master has no limit', () => {
  let f=F.blankFishing();assert.equal(F.castsLeft(f,'2026-11-17'),3);
  f=F.useCast(f,'2026-11-17');f=F.useCast(f,'2026-11-17');f=F.useCast(f,'2026-11-17');
  assert.equal(F.castsLeft(f,'2026-11-17'),0);assert.equal(F.castsLeft(f,'2026-11-18'),3);
  assert.equal(F.castsLeft(f,'2026-11-17',true),99);
  assert.equal(F.useCast(f,'2026-11-18').casts,1);
});

test('the tap: before the dip scares it, inside the window lands it, after it is gone', () => {
  assert.equal(F.judgeTap(1000,2000),'early');
  assert.equal(F.judgeTap(2100,2000),'caught');assert.equal(F.judgeTap(2000+F.FISHING.window,2000),'caught');
  assert.equal(F.judgeTap(2000+F.FISHING.window+1,2000),'late');
  const b=F.biteAfter(()=>0.5);assert.ok(b>=F.FISHING.biteMin&&b<=F.FISHING.biteMax);
});

test('what bites follows the rarity odds; sizes stay in the fish range', () => {
  assert.equal(F.pickFish(seq(0.01,0,0.5)).fish.rarity,'전설');
  assert.equal(F.pickFish(seq(0.1,0,0.5)).fish.rarity,'희귀');
  const c=F.pickFish(seq(0.9,0.3,0.5));assert.equal(c.fish.rarity,'보통');assert.ok(c.size>=c.fish.min&&c.size<=c.fish.max);
  assert.equal(C.FISH.length,12);assert.equal(new Set(C.FISH.map(f=>f.id)).size,12);
});

test('landing: the first of a kind pays a bonus, the log keeps the count and the best size', () => {
  let r=F.land(undefined,'geumbungeo',18);assert.equal(r.first,true);const base=r.coins-F.FISHING.firstBonus;assert.ok(Object.values(F.FISHING.coins).includes(base));assert.deepEqual(r.fishing.log.geumbungeo,{n:1,best:18});
  r=F.land(r.fishing,'geumbungeo',12);assert.equal(r.first,false);assert.equal(r.best,false);assert.equal(r.coins,base);assert.deepEqual(r.fishing.log.geumbungeo,{n:2,best:18});
  assert.equal(F.caughtKinds(r.fishing),1);
  assert.equal(F.land(undefined,'nope',1).coins,0);
});
