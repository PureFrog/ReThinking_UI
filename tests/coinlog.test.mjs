// 코인 달력과 결제창 (core/coinlog.ts)
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const C=await load('core/coinlog');
test('gains add up by day; nothing for a spend; old days drop off', () => {
  let l=C.addCoins(undefined,'2026-11-23',3000);l=C.addCoins(l,'2026-11-23',10000);l=C.addCoins(l,'2026-11-23',-500);
  assert.deepEqual(l,{'2026-11-23':13000});
  for(let i=0;i<C.COINLOG.keepDays+5;i++)l=C.addCoins(l,`2020-${String(i).padStart(5,'0')}`,1);
  assert.equal(Object.keys(l).length,C.COINLOG.keepDays);
});
test('a month grid starts on its weekday, Sunday first; totals and month shifts', () => {
  const g=C.monthGrid('2026-11');assert.equal(g[0][0],'2026-11-01');// 2026-11-01 is a Sunday
  assert.equal(g.flat().filter(Boolean).length,30);assert.ok(g.every(w=>w.length===7));
  assert.equal(C.monthGrid('2026-12')[0][2],'2026-12-01');
  assert.equal(C.monthTotal({'2026-11-02':5,'2026-11-30':7,'2026-12-01':9},'2026-11'),12);
  assert.equal(C.shiftMonth('2026-01',-1),'2025-12');assert.equal(C.shiftMonth('2026-12',1),'2027-01');
});
test('coin packs: priced, bigger packs give more bonus', () => {
  assert.ok(C.COIN_PACKS.length>=3);for(const [i,p] of C.COIN_PACKS.entries()){assert.ok(p.price>0&&p.coins>0);if(i)assert.ok(p.bonus/p.coins>=C.COIN_PACKS[i-1].bonus/C.COIN_PACKS[i-1].coins)}
});
