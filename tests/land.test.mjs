// 부지·건물·랜드마크 (app/core/land.ts): plots are fixed by index, base land gives the first 18 (9 + 9), opening land adds
// its plots, spending needs enough coins and happens once; nothing overlaps the pond, the paths or each other.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const L=await load('core/land');

test('base land gives the first 18 plots (9 a field); opening land adds its own, indices never move', () => {
  assert.deepEqual(L.openPlots([]),[...Array(18).keys()]);
  const more=L.openPlots(['north']);assert.equal(more.length,24);assert.deepEqual(more.slice(18),[24,25,26,27,28,29]);
  assert.equal(L.fieldPlots(['farm2'],'farm').length,12);assert.equal(L.fieldPlots(['orchard2'],'orchard').length,12);
  assert.equal(L.ALL_PLOTS.length,36);assert.equal(L.plotLand(18).id,'farm2');assert.equal(L.plotLand(35).id,'pondside');
});

test('no two spots are too close, and everything stays inside the walkable garden', () => {
  const spots=[...L.ALL_PLOTS,...L.BUILDINGS.map(b=>b.at),...L.CITIES.map(c=>c.at)];
  for(let i=0;i<spots.length;i++)for(let j=i+1;j<spots.length;j++)assert.ok(Math.hypot(spots[i][0]-spots[j][0],spots[i][1]-spots[j][1])>=2.2,`${spots[i]} ${spots[j]}`);
  // the walk reaches 32 since the garden was spread out (core/world.ts)
  for(const [x,z] of spots)assert.ok(Math.hypot(x,z)<31,`${x},${z}`);
});

test('spending: enough coins, once; base land cannot be bought; prices rise with size', () => {
  let r=L.spend(L.BUILT0,40000,{kind:'land',id:'farm2'});assert.deepEqual(r,{ok:false,why:'coins',need:60000});
  r=L.spend(L.BUILT0,105000,{kind:'land',id:'farm2'});assert.equal(r.ok,true);assert.equal(r.coins,5000);assert.deepEqual(r.built.land,['farm2']);
  assert.equal(L.spend(r.built,999000,{kind:'land',id:'farm2'}).why,'have');
  assert.equal(L.spend(L.BUILT0,99000,{kind:'land',id:'farm'}).why,'unknown');
  assert.equal(L.spend(L.BUILT0,199000,{kind:'city',id:'seoul'}).ok,true);
  const prices=L.CITIES.map(c=>c.price);assert.deepEqual(prices,[...prices].sort((a,b)=>a-b));
  for(const c of L.CITIES)assert.doesNotMatch(c.blurb,/사라|팔아|매수|매도|오를|떨어질/);
});
