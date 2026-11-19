// Feedback 11-17: the 꽃집's planting rules (core/plants.ts) and the journal's one line on the stock's flow
// (core/jigi/flow.ts: only what the bars show, no calls on what comes next).
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const P=await load('core/plants');
const F=await load('core/jigi/flow');
const SHOP=await load('content/flower-shop');

test('planting: coins first, then room; the coins go down by the price', () => {
  const tulips=SHOP.shopPlant('tulips');
  assert.deepEqual(P.buyPlant({currency:3,plants:[]},tulips,1,1,1000),{ok:false,why:'coins'});
  const a=P.buyPlant({currency:20,plants:[]},tulips,1,1,1000);
  assert.equal(a.ok,true);assert.equal(a.currency,20-tulips.price);assert.equal(a.plants.length,1);
  assert.deepEqual(P.buyPlant({currency:20,plants:a.plants},tulips,1.5,1.2,2000),{ok:false,why:'close'});
  assert.equal(P.buyPlant({currency:20,plants:a.plants},tulips,4,1,2000).ok,true);
  assert.equal(P.removePlant(a.plants,a.plant.id).length,0);
  assert.ok(SHOP.FLOWER_SHOP.every(p=>p.price>0&&(p.kind==='tree'||p.kind==='flower')));
});

const day=(i)=>new Date(Date.UTC(2026,9,1+i)).toISOString().slice(0,10);
const series=(cs,lastV)=>cs.map((c,i)=>({d:day(i),o:c,h:c,l:c,c,v:i===cs.length-1&&lastV!=null?lastV:1000}));
test('the flow line says what the bars show: a sharp day with heavy trading, a slow slide, a calm month', () => {
  const flat=Array(25).fill(100);
  assert.match(F.flowLine(series([...flat,70],3000),day(30)),/어제보다 30% 급하게 떨어지며 거래가 평소의 3배로 몰렸어요/);
  assert.match(F.flowLine(series([...flat,106]),day(30)),/어제보다 6% 올랐어요/);
  const slide=Array.from({length:25},(_,i)=>100-i*0.6);
  assert.match(F.flowLine(series(slide),day(30)),/최근 한 달 동안 .*% 내려왔어요/);
  assert.match(F.flowLine(series(flat),day(30)),/크게 흔들리지 않은 흐름/);
  assert.equal(F.flowLine(series([100]),day(30)),null);
  // only bars up to today count
  assert.match(F.flowLine(series([...flat,70],3000),day(24)),/크게 흔들리지 않은/);
  for(const l of [F.flowLine(series([...flat,70],3000),day(30)),F.flowLine(series(slide),day(30))])assert.doesNotMatch(l,/팔|사세요|오를 거|내릴 거/);
});
