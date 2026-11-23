// Two views on one stock (멘토링 2026-11-22, app/core/views.ts · app/content/broker/two-views.ts): the books and the
// price path are read apart, a disagreement is said out loud (the value trap), the garden's notes come from the same
// numbers, and nothing tells the player to buy or sell.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const V=await load('core/views'),T=await load('content/broker/two-views'),A=await load('content/broker/demo-account'),I=await load('core/holdings-in'),S=await load('content/signals');
const TODAY='2026-11-20';
const walk=(n,from,step)=>Array.from({length:n},(_,i)=>{const d=new Date(Date.UTC(2026,0,1)+i*864e5).toISOString().slice(0,10),c=from*(1+step)**i;return {d,o:c,h:c,l:c,c}});

test('books: weak, ok, strong; the O-score speaks when the odds crossed the line', () => {
  const b=(fscore,o)=>V.readBooks({asOf:'q',fscore,oscore:[1,o],roe:[1,1],debt:[1,1]});
  assert.equal(b(3,2).state,'weak');assert.equal(b(3,2).model,'fscore');
  assert.equal(b(5,15).state,'weak');assert.equal(b(5,15).model,'ohlson');
  assert.equal(b(5,4).state,'ok');assert.equal(b(7,4).state,'strong');assert.equal(b(8,5).state,'ok');
});

test('path: the last close against its 60-day average and 60 days of change, only bars up to today', () => {
  assert.equal(V.readPath(walk(50,100,0),TODAY),null);
  assert.equal(V.readPath(walk(120,100,-.004),'2026-12-31').state,'down');
  assert.equal(V.readPath(walk(120,100,.003),'2026-12-31').state,'up');
  assert.equal(V.readPath(walk(120,100,0),'2026-12-31').state,'flat');
  // a later fall is not seen before it happens
  const bs=[...walk(120,100,.003),...walk(60,140,-.02).map((b,i)=>({...b,d:new Date(Date.UTC(2026,3,1)+i*864e5).toISOString().slice(0,10)}))];
  assert.equal(V.readPath(bs,'2026-03-31').state,'up');assert.equal(V.readPath(bs,'2026-12-31').state,'down');
  assert.equal(V.readPath(walk(120,100,0),'2026-12-31').spark.length,60);
});

test('together: a disagreement is named, the value trap included', () => {
  assert.equal(V.together('weak','down'),'both');
  assert.equal(V.together('strong','down'),'trap');assert.equal(V.together('ok','down'),'trap');
  assert.equal(V.together('weak','up'),'ahead');assert.equal(V.together('weak','flat'),'books');
  assert.equal(V.together('strong','up'),'calm');
  assert.equal(V.disagree('trap'),true);assert.equal(V.disagree('ahead'),true);assert.equal(V.disagree('both'),false);
});

test('the practice account shows every case once or more', () => {
  const got=Object.fromEntries(A.DEMO_ACCOUNT.holdings.map(l=>[l.name,T.twoViews(l.code,TODAY).together]));
  assert.equal(got['에코프로비엠'],'both');assert.equal(got['펄어비스'],'trap');assert.equal(got['알테오젠'],'ahead');assert.equal(got['클래시스'],'calm');
  for(const l of A.DEMO_ACCOUNT.holdings){const v=T.twoViews(l.code,TODAY);assert.ok(v.book&&v.path,l.name);assert.equal(v.spark.length,60)}
});

test('the garden note and the MTS sheet read the same numbers', () => {
  const list=A.DEMO_ACCOUNT.holdings.map(A.toStd);
  const {holdings}=I.stdToHoldings([],list,list.map((_,i)=>i),()=>0,TODAY,1);
  const notes=S.signalProvider.today(holdings,TODAY);
  for(const s of notes){const h=holdings.find(x=>x.id===s.holdingId),v=T.twoViews(h.code,TODAY);
    if(s.model==='fscore')assert.match(s.headline,new RegExp(`9점 중 ${v.book.facts[0].v.match(/(\d)점$/)[1]}점`));
    if(s.model==='gradual'){assert.equal(v.path.chip,'내려가는 중');assert.match(s.headline,new RegExp(v.path.facts[2].v.replace('째','')))}
    // no made-up numbers on a stock with books
    assert.notEqual(s.headline,'저점이 2주째 낮아지는 중')}
  assert.ok(notes.length>=4);
});

test('nothing on the sheet tells the player to buy or sell or says where the price goes', () => {
  const text=JSON.stringify([T.SUM,T.BLIND,...A.DEMO_ACCOUNT.holdings.map(l=>T.twoViews(l.code,TODAY))]);
  assert.doesNotMatch(text,/팔아|사세요|매수하|매도하|오를 거|내릴 거|사야|팔아야/);
  assert.match(T.BLIND,/수급/);assert.match(T.BLIND,/투자 권유가 아니/);
});
