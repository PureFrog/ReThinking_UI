// 통신기 (2026-11-23, app/content/comm.ts · app/proto3d/ui/Comm.tsx): the practice-account MTS in the garden holds the
// recorded stocks and the coin stocks in one balance; coins are the deposit, nothing reaches a real account.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const C=await load('content/comm'),D=await load('content/demo-garden'),V=await load('core/virtual'),W=await load('core/walk');
const DAY='2026-11-20';

test('one balance: recorded stocks at their return, coin stocks at today\'s price, coins as the deposit', () => {
  const q=V.quote('263750',DAY);assert.ok(q);
  const lot={id:1,code:'263750',name:'펄어비스',qty:3,cost:40000,plot:9,day:'2026-11-01'};
  const a=C.commAccount(D.DEMO_HOLDINGS,[lot],50000,DAY,id=>V.VIRTUAL_ID+id);
  assert.equal(a.lines.length,D.DEMO_HOLDINGS.length+1);
  const real=a.lines.filter(l=>l.kind==='real'),v=a.lines.find(l=>l.kind==='virtual');
  // a recorded line is worth what the garden says it is worth (core/walk.ts worthOf), so the tree and the balance agree
  for(const l of real){const h=D.DEMO_HOLDINGS.find(x=>x.id===l.id);assert.ok(Math.abs(l.lastPrice*l.quantity-W.worthOf(h))<=l.quantity)}
  assert.equal(v.id,V.VIRTUAL_ID+1);assert.equal(v.lastPrice,q.price);assert.equal(v.avgPrice,40000);assert.equal(v.lotId,1);
  assert.equal(a.coins,50000);assert.equal(a.total,a.worth+50000);
  assert.equal(a.pl,a.worth-a.buy);
});

test('an empty garden is an empty balance, the coins still there', () => {
  const a=C.commAccount([],[],1234,DAY,id=>id);
  assert.deepEqual([a.lines.length,a.worth,a.buy,a.rate,a.total],[0,0,0,0,1234]);
});
