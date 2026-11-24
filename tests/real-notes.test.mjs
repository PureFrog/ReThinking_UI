// Real holdings get no made-up numbers (2026-11-23): moa's chart note and the 되돌아보기 note read only real bars, a
// real holding without loaded bars gets nothing (never the mock walk), and the small print says real vs mock prices.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const S=await load('content/signals');
const K=await load('core/jigi/stocks');
const A=await load('content/analysts');

function series(closes,v=1000){const out=[];let t=Date.parse('2026-09-01T00:00:00Z');
  for(const c of closes){while([0,6].includes(new Date(t).getUTCDay()))t+=864e5;out.push({d:new Date(t).toISOString().slice(0,10),o:c,h:c,l:c,c,v});t+=864e5}
  return out}
const hold=(o)=>({id:1,name:'테스트',rate:0,lossDays:0,date:'2026-09-01',price:10000,real:true,...o});

test('a real code without loaded bars gets no chart note', () => {
  assert.equal(S.realSignal(hold({code:'999001'})),null);
});

test('the 되돌아보기 note on a real holding uses its real bars only', () => {
  const bs=series([...Array(20).fill(10000),...Array(12).fill(9000)]);   // 12 closes under the 20-day line
  K.setReal('999002','실제주',bs);
  const s=S.lookbackNote([hold({code:'999002',rate:-10})]);
  assert.equal(s.headline,'20일선 아래 12거래일째');
  assert.deepEqual(s.evidence.map(e=>e.k),['20일선','거래량','수익률','기준일']);
  assert.equal(s.evidence[2].v,'-10%');
  assert.equal(s.evidence[3].v,bs.at(-1).d);
});

test('a real holding without bars is skipped; the next tree gets the note, or none', () => {
  assert.equal(S.lookbackNote([hold({code:'999003',rate:-30})]),null);
  const s=S.lookbackNote([hold({code:'999003',rate:-30}),{id:2,name:'모의',rate:5,lossDays:0,date:'2026-09-01',price:1}]);
  assert.equal(s.holdingId,2);
});

test('the small print says which prices are real', () => {
  K.setReal('999004','실제주2',series(Array(30).fill(10000)));
  assert.match(K.priceLegal(['999004']),/^시세는 실제 종가 기준이에요/);
  assert.match(K.priceLegal(['005930x']),/^시세는 모의 데이터예요/);
  assert.match(K.priceLegal(['999004','005930x']),/^실제 종목은 실제 종가/);
  assert.match(K.priceLegal([]),/모의/);
});

test('the price-trend note is not named after the 서서히 model', () => {
  assert.notEqual(A.MODEL_INFO.gradual.name,'서서히');
});

test('a real holding\'s card shows no made-up books, a mock one keeps them', async () => {
  const R=await load('content/recheck');
  const h={id:9,name:'HLB',code:'028300',rate:-10,lossDays:0,date:'2026-10-01',price:40000,kind:1,quantity:1};
  const mock=R.recheckCard(h,[h],'2026-11-20');
  assert.ok(mock.views?.book);
  const real=R.recheckCard({...h,real:true},[{...h,real:true}],'2026-11-20');
  assert.equal(real.views?.book??null,null);
  assert.equal(real.views?.split??false,false);
});
