// 주간 챌린지 (core/challenge.ts): my practice account from Monday against the index, and when the week is over.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const W=await load('core/challenge');
test('Monday of a day, and when the week is over', () => {
  assert.equal(W.mondayOf('2026-11-26'),'2026-11-23');assert.equal(W.mondayOf('2026-11-23'),'2026-11-23');assert.equal(W.mondayOf('2026-11-29'),'2026-11-23');
  assert.equal(W.weekOver('2026-11-26',20),false);assert.equal(W.weekOver('2026-11-27',15),false);assert.equal(W.weekOver('2026-11-27',16),true);assert.equal(W.weekOver('2026-11-28',9),true);
});
test('a lot held from last week counts from the week-start close; one bought this week from its cost', () => {
  const lots=[{code:'A',qty:10,cost:1000,day:'2026-11-10'},{code:'B',qty:1,cost:5000,day:'2026-11-24'}];
  const r=W.weekResult(lots,'2026-11-23',c=>c==='A'?1200:null,l=>l.code==='A'?1320:5500,1.5);
  // base 12000+5000=17000, now 13200+5500=18700 → +10%
  assert.equal(r.mine,10);assert.equal(r.beat,true);assert.equal(r.joined,true);
  assert.equal(W.weekResult([],'2026-11-23',()=>null,()=>null,0).joined,false);
});
