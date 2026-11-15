// 지기 투자일지 (app/core/jigi): mock bars are stable and on the tick, a journal needs its nine things before it saves,
// saving again makes a new version, quick chips prefill "한 일", and the trash forgets after 30 days.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const S=await load('core/jigi/stocks');
const J=await load('core/jigi/journal');
const today='2026-11-15',now=Date.parse('2026-11-15T10:00:00Z');

test('mock bars: same every time, weekdays only, anchored near the real level, confirmed close is before today', () => {
  const a=S.bars('005930'),b=S.bars('005930');
  assert.equal(a,b);assert.ok(a.length>3000);
  assert.ok(a.every(x=>![0,6].includes(new Date(x.d+'T00:00:00Z').getUTCDay())));
  assert.ok(a.every(x=>x.l<=Math.min(x.o,x.c)&&x.h>=Math.max(x.o,x.c)&&x.c%50===0));
  const ref=S.barOnOrBefore('005930','2026-11-13');assert.ok(Math.abs(ref.c-71200)<=200,String(ref.c));
  assert.ok(S.lastConfirmed('005930',today).d<today);
  assert.equal(S.barOnOrBefore('005930','2026-11-15').d,'2026-11-13');// Sunday falls back to Friday
  assert.ok(S.bars('373220')[0].d>='2022-01-27');// listed later
  assert.deepEqual(S.searchStocks('하이닉').map(s=>s.code),['000660']);
  assert.deepEqual(S.searchStocks('0059').map(s=>s.code),['005930']);
});

test('a journal saves only with its nine required things; saving again is a new version', () => {
  const j=J.newJournal('j1',now,today,{holdingId:6,code:'005930'});
  assert.equal(j.stock.name,'삼성전자');assert.equal(j.anchor.date,'2026-11-13');
  let r=J.saveJournal(j,now);assert.equal(r.ok,false);
  assert.deepEqual(r.missing.map(m=>m.key),['phys','ment','understand','action','hypo','reason','recheck','horizon']);
  Object.assign(j.f,{phys:'상',ment:'중',understand:'일부 이해',action:'보유',hypo:'메모리 가격이 오른다.',reason:'재고가 줄었다.',recheckUnknown:true,horizon:'3개월'});
  r=J.saveJournal(j,now);assert.equal(r.ok,true);assert.equal(r.version,1);assert.equal(r.journal.status,'saved');
  const r2=J.saveJournal(r.journal,now+1000);assert.equal(r2.version,2);assert.equal(r2.journal.versions[1].label,'수정');
  assert.equal(J.checkDateOf('3개월','2026-11-15'),'2027-02-15');assert.equal(J.checkDateOf('아직 모르겠음','2026-11-15'),'');
});

test('quick chips fill 한 일: 손절 검토 stays 보유 and opens the exit plan', () => {
  assert.equal(J.newJournal('a',now,today,{quick:'hold'}).f.action,'보유');
  assert.equal(J.newJournal('b',now,today,{quick:'watch'}).f.action,'관찰');
  const r=J.newJournal('c',now,today,{quick:'review'});assert.equal(r.f.action,'보유');assert.equal(r.open.exit,true);
  for (const q of Object.values(J.QUICK)) assert.doesNotMatch(q.action,/매도/);
});

test('bookshelf groups by stock, newest first; trash is forgotten after 30 days', () => {
  const mk=(id,code,t,extra={})=>({...J.newJournal(id,t,today,{code}),...extra});
  const js=[mk('1','005930',now-3e9),mk('2','000660',now-1e9),mk('3','005930',now-2e9),mk('4','005930',now,{deletedAt:now-31*864e5})];
  assert.deepEqual(J.byStock(js).map(g=>[g.code,g.list.length]),[['000660',1],['005930',2]]);
  assert.deepEqual(J.ofStock(js,'005930').map(j=>j.id),['1','3']);
  assert.deepEqual(J.purgeOld(js,now).map(j=>j.id),['1','2','3']);
});
