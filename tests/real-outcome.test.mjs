// Grading on real closes (app/content/outcomes.ts, 2026-11-23): a judgment on a stock with real prices is graded on its
// real closes once the mark day's close is in; until then the grade is not due. Mock stocks keep the mock outcome.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const O=await load('content/outcomes');
const J=await load('core/judgment');
const K=await load('core/jigi/stocks');

// weekday bars from 2026-09-01 with the given closes
function series(closes){const out=[];let t=Date.parse('2026-09-01T00:00:00Z');
  for(const c of closes){while([0,6].includes(new Date(t).getUTCDay()))t+=864e5;out.push({d:new Date(t).toISOString().slice(0,10),o:c,h:c,l:c,c});t+=864e5}
  return out}

test('the move is from the close on or before the judgment day to the close on or before the mark day', () => {
  const bs=series(Array.from({length:40},(_,i)=>10000+i*100));      // 2026-09-01 .. 2026-10-26
  // 2026-09-05 is a Saturday: base = Friday 09-04 (10300); +30 days = 10-05 (Monday, 10000+24*100=12400)
  assert.equal(O.realAfter(bs,'2026-09-05',30),Math.round((12400/10300-1)*1000)/10);
});

test('no grade until a close on or after the mark day is in', () => {
  const bs=series(Array.from({length:20},()=>10000));               // ends 2026-09-28
  assert.equal(O.realAfter(bs,'2026-09-01',30),null);
  assert.equal(O.realAfter([],'2026-09-01',30),null);
});

test('a real judgment uses its own stock even after the tree is gone; a mock one keeps the mock', () => {
  K.setReal('095270','웨이브일렉트로',series(Array.from({length:40},(_,i)=>i<5?10000:9000)));
  const j={holdingId:42,day:'2026-09-01',code:'095270',real:true};
  assert.equal(O.outcomeFor(j,30),-10);
  assert.equal(O.outcomeFor({holdingId:3,day:'2026-09-01'},30),O.mockAfter(3,'2026-09-01',30));
  // a real stock whose bars are not loaded (signed out): wait, never the mock
  assert.equal(O.outcomeFor({holdingId:9,day:'2026-09-01',code:'999999',real:true},30),null);
  // an older judgment without code: the holding as it is now decides
  assert.equal(O.outcomeFor({holdingId:42,day:'2026-09-01'},30,{id:42,code:'095270',real:true}),-10);
});

test('dueGrades leaves out marks whose outcome is not known yet', () => {
  const base={name:'x',choice:'hold',reason:'r',confidence:3,rate:0};
  const list=[{...base,id:'a',holdingId:1,day:'2026-09-01'},{...base,id:'b',holdingId:2,day:'2026-09-01'}];
  assert.equal(J.dueGrades(list,[],'2026-10-15').length,2);
  assert.deepEqual(J.dueGrades(list,[],'2026-10-15',(j)=>j.id==='a').map(d=>d.judgment.id),['a']);
});
