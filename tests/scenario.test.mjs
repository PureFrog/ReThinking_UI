// 시나리오 퀘스트 (core/scenario.ts, content/scenario-practice.ts; PM 설계 2026-11-22): the practice file is in time order,
// orders fill at the next day's open with the fee, the scores follow 12장, the notebook stand-in grader and a bookmark.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const S=await load('core/scenario');
const C=await load('content/scenario-practice');
const P=C.PRACTICE_01;

test('the practice file: three turns in order before the evaluation day, every page filled', () => {
  assert.equal(P.turns.length,3);const last=P.market.days.length-1;
  assert.ok(P.turns.every((t,i)=>t.day>0&&t.day+1<last&&(i===0||t.day>P.turns[i-1].day)),'start < 1 < 2 < 3 < 평가일, each fill before it');
  for(const t of P.turns){assert.ok(t.paper.pages.length>=2);assert.ok(t.docs.length>=1);assert.ok(t.ask&&t.printed.target&&t.facts.length>=3)}
  assert.equal(P.market.open.length,P.market.days.length);assert.ok(P.market.close.every(v=>v>0));
});
test('a sell fills at the next trading day open, of what is left, with 0.1%', () => {
  const t=P.turns[0],before=S.position(P,[1/4],t.day);assert.equal(before.qty,1000,'not before the next day');
  const after=S.position(P,[1/4],t.day+1);assert.equal(after.qty,750);
  assert.ok(Math.abs(after.cash-250*P.market.open[t.day+1]*0.999)<1e-6);
  const two=S.position(P,[1/2,1/2],P.turns[1].day+1);assert.equal(two.qty,250);
  assert.equal(S.leftAfter(750,1/8),657);
});
test('12장: holding on everywhere scores R 50; J is the scenes\' mean; total 0.7J + 0.3R', () => {
  const notes=[{dir:'flat',reason:'납품가 5% 인상에도 단골이 들녘을 찾아서 주문은 비슷할 것 같다'},{dir:'flat',reason:'할인'},{dir:'down',reason:'판촉비가 18% 늘어서 그걸 빼면 주문이 줄 것이다'}];
  const b={...S.newBook(P.id,'2026-11-23'),notes,orders:[0,0,0]};const r=S.result(P,b);
  assert.ok(Math.abs(r.me-r.hold)<1e-9);assert.equal(r.R,50);
  const g=notes.map((n,i)=>S.gradeNote(P,i,n).score);assert.equal(r.J,Math.round((g[0]+g[1]+g[2])/3));
  assert.equal(r.total,Math.round((0.7*(g[0]+g[1]+g[2])/3+0.3*50)*10)/10);
  // the worked example of 12장: J 84, me −2%, hold −6% → R 70, total 79.8
  assert.equal(Math.round((0.7*84+0.3*Math.max(0,Math.min(100,50+5*4)))*10)/10,79.8);
});
test('the stand-in grader: a fact and a reason score full, a bare word little, a turned-around sentence is flagged', () => {
  const full=S.gradeNote(P,0,{dir:'flat',reason:'납품가 5% 인상에도 단골이 들녘을 찾아서 주문은 비슷할 것 같다'});assert.equal(full.score,100);assert.equal(full.fix.length,0);
  const bare=S.gradeNote(P,1,{dir:'flat',reason:'할인'});assert.ok(bare.score<50);assert.ok(bare.fix.length>0);
  const turned=S.gradeNote(P,0,{dir:'up',reason:'납품가가 5% 올라서 주문이 줄어들 것 같다'});assert.ok(turned.fix.some(f=>f.includes('방향')));
});
test('verdicts: ±2% is 비슷; the filing pair in words; a bookmark from another day is not used', () => {
  assert.equal(S.verdict(P,0,{dir:'flat',reason:''}),'hit');assert.equal(S.verdict(P,0,{dir:'down',reason:''}),'miss');
  assert.equal(S.filingWord(120,80),'공시상 보유 감소');assert.equal(S.filingWord(120,120),'분기 말 신고 수량 유지');assert.equal(S.filingWord(120,0),'대상 분기 공시에서 보유 미확인');
  const b={...S.newBook(P.id,'2026-11-23'),step:'run',turn:1,tick:20,notes:[{dir:'up',reason:'x'}],orders:[0]};
  assert.equal(S.readBook(b,P,'2026-11-24'),null);
  const r=S.readBook(b,P,'2026-11-23');assert.equal(r.step,'turn');assert.equal(r.tick,P.turns[1].day);assert.equal(r.sell,null);
});
