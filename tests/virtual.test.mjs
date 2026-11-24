// 게임 구성 2026-11-20: coins in 원, the 가상 종목 밭 (core/virtual.ts), real stocks only in the 밭 (core/land.ts fieldPlots)
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const V=await load('core/virtual');
const L=await load('core/land');
const W=await load('core/won');
const E=await load('core/ledger');

test('coins are 원 at real-money sizes', () => {
  assert.equal(W.won(1234567),'1,234,567원');assert.equal(W.wonShort(1030000),'1,030,000');assert.equal(W.wonShort(12000),'12,000');
  assert.ok(E.EARN.journal>=1000&&E.EARN.journal%1000===0);assert.ok(E.START_GRANT>=500000);
});
test('the 밭 is for real stocks, the 과수원 for virtual ones', () => {
  const farm=L.fieldPlots([],'farm'),orch=L.fieldPlots([],'orchard');
  assert.equal(farm.length,9);assert.equal(orch.length,9);assert.ok(farm.every(i=>!orch.includes(i)));
});
test('buying whole shares with enough coins into a free plot; a second buy averages; selling pays today\'s price', () => {
  const plots=L.fieldPlots([],'orchard');let o={currency:1_000_000,virtual:[]};
  assert.equal(V.buyVirtual(o,'005930',0,70000,plots,'d').why,'qty');
  assert.deepEqual(V.buyVirtual(o,'005930',20,70000,plots,'d'),{ok:false,why:'coins',need:400000});
  let r=V.buyVirtual(o,'005930',10,70000,plots,'d');assert.equal(r.ok,true);assert.equal(r.currency,300000);assert.equal(r.lot.plot,plots[0]);
  o={currency:r.currency,virtual:r.virtual};
  r=V.buyVirtual(o,'005930',2,76000,plots,'d2');assert.equal(r.virtual.length,1);assert.equal(r.lot.qty,12);assert.equal(r.lot.cost,71000);
  o={currency:r.currency,virtual:r.virtual};
  const s=V.sellVirtual(o,r.lot.id,12,80000);assert.equal(s.ok,true);assert.equal(s.gain,(80000-71000)*12);assert.equal(s.virtual.length,0);assert.equal(s.currency,o.currency+960000);
  const t=V.virtualTree(r.lot,80000);assert.equal(t.virtual,true);assert.ok(V.isVirtualTree(t.id));assert.equal(t.rate,12.7);
  assert.ok(V.quote('005930','2026-11-20').price>0);
});

// 2026-11-23: real closes for virtual stocks (kept apart from the journals' bars) and lots that keep their own prices
const K2=await load('core/jigi/stocks');
function realSeries(from,closes){const out=[];let t=Date.parse(from+'T00:00:00Z');
  for(const c of closes){while([0,6].includes(new Date(t).getUTCDay()))t+=864e5;out.push({d:new Date(t).toISOString().slice(0,10),o:c,h:c,l:c,c});t+=864e5}
  return out}

test('real closes for a virtual stock price it, without touching the journals\' bars', () => {
  const V2=V;const code='196170';
  const before=V2.quote(code,'2026-11-20');assert.equal(before.real,false);
  V2.setVirtualReal(code,realSeries('2026-11-02',Array(15).fill(123400)));
  const q=V2.quote(code,'2026-11-20');assert.equal(q.real,true);assert.equal(q.price,123400);
  assert.equal(K2.isReal(code),false);                                   // the journals still see the mock walk
  assert.equal(V2.quote(code,'2026-11-20','mock').price,before.price);
});

test('a lot keeps its prices: a mock lot stays on the mock walk, a real lot waits for real closes', () => {
  const code='196170',mock=V.quote(code,'2026-11-20','mock');
  const mockLot={id:1,code,name:'x',qty:2,cost:mock.price,plot:0,day:'2026-11-20',src:'mock'};
  assert.equal(V.lotQuote(mockLot,'2026-11-21').real,false);
  assert.equal(V.lotSrc({...mockLot,src:undefined}),'mock');              // an older lot: its cost is the mock close
  const realLot={...mockLot,cost:123400,src:'real'};
  assert.equal(V.lotSrc({...realLot,src:undefined}),'real');
  assert.equal(V.lotQuote({...realLot,code:'041510'},'2026-11-21'),null); // real closes not loaded: no price yet
  // a second buy adds on the tree's own prices
  assert.equal(V.buyQuote([mockLot],code,'2026-11-21').src,'mock');
  assert.equal(V.buyQuote([],code,'2026-11-21').src,'real');
  const b=V.buyVirtual({currency:1e7,virtual:[]},code,1,123400,[0],'2026-11-21','real');
  assert.equal(b.lot.src,'real');
});

test('the cart settles on the lot\'s own prices', () => {
  const code='196170';
  assert.equal(V.closeFrom(code,'2026-11-10','2026-11-21','real').c,123400);
  assert.notEqual(V.closeFrom(code,'2026-11-10','2026-11-21','mock').c,123400);
  assert.equal(V.closeFrom('041510','2026-11-10','2026-11-21','real'),null);
});
