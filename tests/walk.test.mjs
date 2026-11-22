// 유저 워크플로우 (PM 2026-11-21): the first walk's order, the merchant's hours and candidates, the farmer's cart, tree size
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const W=await load('core/walk');

test('the first walk goes station by station; only the current person talks', () => {
  let w=W.WALK0;assert.equal(W.stepOf(w),'square');assert.equal(W.mayTalk(w,'farmer'),false);
  w=W.passStep(w,'square');assert.equal(W.stepOf(w),'farmer');assert.equal(W.mayTalk(w,'farmer'),true);assert.equal(W.mayTalk(w,'merchant'),false);
  assert.equal(W.passStep(w,'news'),w);// not the current one: nothing skipped
  for(const id of W.WALK_STEPS.slice(1))w=W.passStep(w,id);
  assert.equal(W.walkDone(w),true);assert.equal(W.stepOf(w),null);assert.equal(W.mayTalk(w,'tailor'),true);
  assert.deepEqual(W.readWalk(JSON.parse(JSON.stringify(w))),w);assert.deepEqual(W.readWalk({v:2}),W.WALK0);
  // selling is the farmer again
  assert.equal(W.PERSON_OF.sell,'farmer');
});
test('the merchant stands 08:00 to 20:00 in Korea and has the same five all day', () => {
  assert.equal(W.merchantHere(7*60+59),false);assert.equal(W.merchantHere(8*60),true);assert.equal(W.merchantHere(19*60+59),true);assert.equal(W.merchantHere(20*60),false);
  assert.equal(W.nextOpenLabel(6*60),'오늘 오전 8시');assert.equal(W.nextOpenLabel(21*60),'내일 오전 8시');
  assert.equal(W.kstMinutes(new Date('2026-11-20T23:30:00Z')),8*60+30);
  const pool=[...'abcdefghijkl'];const a=W.candidates(pool,'2026-11-21'),b=W.candidates(pool,'2026-11-21'),c=W.candidates(pool,'2026-11-22');
  assert.equal(a.length,5);assert.deepEqual(a,b);assert.notDeepEqual(a,c);assert.equal(new Set(a).size,5);
});
test('the cart is paid once at the next trading day\'s close; practice pays nothing', () => {
  assert.equal(W.tradingDayAfter('2026-11-20'),'2026-11-23');// Friday → Monday
  assert.equal(W.tradingDayAfter('2026-11-23'),'2026-11-24');
  assert.equal(W.loadCart([],{lotId:1,code:'005930',name:'삼성전자'},0,'2026-11-20'),null);
  let cart=W.loadCart([],{lotId:1,code:'005930',name:'삼성전자'},2,'2026-11-20');
  cart=W.loadCart(cart,{lotId:2,code:'000660',name:'SK하이닉스'},1,'2026-11-20',true);
  assert.equal(W.waitingQty(cart,1),2);assert.equal(W.waitingQty(cart,2),0);
  // not final yet: nothing moves
  let r=W.settleCart(cart,()=>null);assert.equal(r.coins,0);assert.equal(W.waiting(r.cart).length,2);
  // 100 today, +3% at the next close: 103 a share
  r=W.settleCart(cart,(code,from)=>({d:from,c:code==='005930'?103:200}));
  assert.equal(r.coins,206);assert.equal(r.settled.length,2);assert.equal(r.cart[1].paid,200);assert.equal(W.waiting(r.cart).length,0);
  // once only
  assert.equal(W.settleCart(r.cart,(c,from)=>({d:from,c:999})).coins,0);
});
test('a tree\'s size follows what the holding is worth, continuously', () => {
  const s1=W.treeSize(1_000_000),s2=W.treeSize(2_000_000),s10=W.treeSize(10_000_000);
  assert.equal(s1,0.8);assert.ok(s2>s1&&s10>s2);assert.equal(W.treeSize(0),W.SIZE.min);assert.equal(W.treeSize(1e12),W.SIZE.max);
  assert.equal(W.worthOf({price:10000,rate:10,quantity:3}),33000);
});
