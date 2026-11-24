// 처분효과 (증권사 멘토링 2026-11-22, 1.7; app/core/recheck.ts · app/content/recheck.ts): in the 3D garden the days held
// change nothing on the tree, and the card asks a gain and a loss the same question.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const R=await load('core/recheck'),C=await load('content/recheck'),D=await load('content/demo-garden'),M=await load('core/model');
const h=(o)=>({id:1,name:'x',code:'263750',kind:0,price:50000,quantity:10,date:'2026-10-20',rate:5,plot:0,lossDays:0,...o});

test('the tree does not grow with the days held: same worth and return, same tree', () => {
  const young=R.gardenTree(h({date:'2026-10-26'})),old=R.gardenTree(h({date:'2021-01-04'}));
  assert.deepEqual(young,old);
  // the old age-based growth would have told them apart
  assert.notEqual(M.growthOf(M.heldDays('2026-10-26'),M.defaultRules),M.growthOf(M.heldDays('2021-01-04'),M.defaultRules));
  // a long, deep loss is not a stump to keep: it stays a wilting tree, sized by what it is worth
  const lost=R.gardenTree(h({rate:-30,lossDays:400,date:'2020-01-02'}));
  assert.equal(lost.condition,'wilt');
  assert.equal(lost.growth,'young');
});

test('size follows worth now, up and down alike', () => {
  const up=R.gardenTree(h({rate:40})),flat=R.gardenTree(h({rate:0})),down=R.gardenTree(h({rate:-40}));
  assert.ok(up.size>flat.size&&flat.size>down.size);
});

test('the card leads with worth and share, and asks a gain and a loss the same thing', () => {
  const all=D.DEMO_HOLDINGS,win=all.find(x=>x.rate>10),lose=all.find(x=>x.rate<-20);
  const a=C.recheckCard(win,all,'2026-11-20'),b=C.recheckCard(lose,all,'2026-11-20');
  const sum=all.reduce((n,x)=>n+C.recheckCard(x,all,'2026-11-20').weight,0);
  assert.ok(Math.abs(sum-100)<0.5,`weights add to 100 (${sum})`);
  assert.equal(a.note,b.note);
  assert.equal(a.ask.replace(/[\d.]+%/,'N%'),b.ask.replace(/[\d.]+%/,'N%'));
  assert.ok(a.ask.includes(`${a.weight}%`));
  for(const c of [a,b])assert.doesNotMatch(c.ask+c.note,/팔아|사세요|매수하|매도하|오를 거|버텨|존버/);
});

test('the two views come along when there are books; no books, no disagreement named', () => {
  const trap=C.recheckCard(h({code:'263750'}),[h({code:'263750'})],'2026-11-20');
  assert.equal(trap.views.book,'튼튼');
  assert.equal(trap.views.path,'내려가는 중');
  assert.equal(trap.views.split,true);
  const nobooks=C.recheckCard(h({code:'000660'}),[h({code:'000660'})],'2026-11-20');
  if(nobooks.views){assert.equal(nobooks.views.book,null);assert.equal(nobooks.views.split,false)}
  assert.equal(C.recheckCard(h({code:undefined}),[h({code:undefined})],'2026-11-20').views,null);
});
