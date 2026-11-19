// A garden on real prices (app/core/real.ts, private test 2026-11-17): the buying price is that day's real close, the
// return and loss days follow the latest close, moa's notes use only what the bars show.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const R=await load('core/real');
const P=await load('core/portfolio');
const M=await load('core/model');
const S=await load('content/signals');
const K=await load('core/jigi/stocks');

// weekday bars from a list of closes, starting 2026-09-01
function series(closes,{vol=1000,lastVol}={}){const out=[];let t=Date.parse('2026-09-01T00:00:00Z');
  for(const [i,c] of closes.entries()){while([0,6].includes(new Date(t).getUTCDay()))t+=864e5;
    out.push({d:new Date(t).toISOString().slice(0,10),o:c,h:c,l:c,c,v:i===closes.length-1&&lastVol!=null?lastVol:vol});t+=864e5}
  return out}
const holding=(p)=>({id:1,name:'삼성전자',code:'005930',kind:0,price:100,quantity:3,date:'2026-09-01',rate:0,plot:0,lossDays:0,real:true,...p});

test('the buying price is the close on (or before) the buying day', () => {
  const b=series([100,101,102]);
  assert.equal(R.buyClose(b,'2026-09-02').c,101);
  assert.equal(R.buyClose(b,'2026-09-06').c,102);// a Sunday: the Friday before... here the last bar
  assert.equal(R.buyClose(b,'2026-08-01'),null);
});

test('return and loss days follow the latest close; a holding not on real prices is left alone', () => {
  const b=series([100,105,98,97,95]);// last 2026-09-07 (Mon); last at/above 100 on 2026-09-02
  const h=R.refreshed(holding(),b);
  assert.equal(h.rate,-5);assert.equal(h.asOf,'2026-09-07');assert.equal(h.lossDays,5);
  assert.equal(R.refreshed(holding({price:90}),b).lossDays,0);
  const mock=holding({real:false});assert.equal(R.refreshed(mock,b),mock);
  // same numbers twice: the same object (no needless save)
  assert.equal(R.refreshed(h,b),h);
});

test("moa's read: a crash needs -5% on 2x volume; a slow slide needs a loss and 10 days under the 20-day line", () => {
  const flat=Array(25).fill(100);
  const crash=series([...flat,94],{lastVol:2500}),r1=R.readBars(holding(),crash);
  assert.equal(r1.dayMove,-6);assert.equal(r1.volX,2.5);assert.equal(R.priceFlag(r1),'crash');
  assert.equal(R.priceFlag(R.readBars(holding(),series([...flat,94],{lastVol:1500}))),null);
  const slide=series([...Array(20).fill(100),...Array.from({length:15},(_,i)=>98-i*0.5)]),r2=R.readBars(holding(),slide);
  assert.ok(r2.below20>=10);assert.ok(r2.rate<=-8);assert.equal(R.priceFlag(r2),'gradual');
  assert.equal(R.readBars(holding(),series([100,99])),null);// too short
});

test('notes on real trees carry only real numbers; no made-up fundamentals', () => {
  const flat=Array(25).fill(100);
  K.setReal('005930','삼성전자',series([...flat,94],{lastVol:2500}));
  const [s]=S.mockSignals([holding()],'2026-10-06');
  assert.equal(s.analyst,'moa');assert.equal(s.model,'crash');
  assert.ok(s.evidence.some(e=>e.k==='기준일'));assert.match(s.headline,/-6%/);
  // a big loss on a real tree does not invent tori's F-score note
  K.setReal('000660','SK하이닉스',series(Array(26).fill(100)));
  assert.deepEqual(S.mockSignals([holding({id:2,code:'000660',name:'SK하이닉스',price:200})],'2026-10-06'),[]);
});

test('planting on real prices: one tree per stock, real flag, held days to today', () => {
  const rows=[{code:'005930',name:'삼성전자',date:'2026-09-02',quantity:3,price:101},{code:'005930',name:'삼성전자',date:'2026-09-03',quantity:5,price:102}];
  const out=P.plantReal([],rows,[0,1,2],()=>0,1000);
  assert.equal(out.holdings.length,1);assert.equal(out.holdings[0].quantity,5);assert.equal(out.holdings[0].real,true);
  assert.equal(P.realDraftOk(rows[0],'2026-11-17'),true);assert.equal(P.realDraftOk({...rows[0],date:'2026-12-01'},'2026-11-17'),false);
  assert.equal(P.realDraftOk({...rows[0],price:0},'2026-11-17'),false);
  assert.equal(M.heldDays('2026-11-07','2026-11-17'),10);
});

test('a captured or typed name finds its KRX code; the buying day comes from the held period, the price from the capture or that close', () => {
  const hits=[{code:'005930',name:'삼성전자'},{code:'005935',name:'삼성전자우'}];
  assert.equal(P.matchName('삼성 전자',hits).code,'005930');
  assert.equal(P.matchName('삼성',hits),null);// two hits, no exact one
  assert.equal(P.matchName('하이닉스',[{code:'000660',name:'SK하이닉스'}]).code,'000660');// the only hit
  assert.equal(P.matchName('한빛전자',[]),null);
  const d={name:'삼성전자',rate:-3,quantity:4,price:71000,keep:true,held:'month',existing:null};
  const r=P.draftToReal(d,hits[0],'2026-11-17',()=>65000);
  assert.deepEqual(r,{code:'005930',name:'삼성전자',date:'2026-10-18',quantity:4,price:71000});
  assert.equal(P.draftToReal({...d,price:0},hits[0],'2026-11-17',()=>65000).price,65000);
  assert.equal(P.draftToReal({...d,price:0},hits[0],'2026-11-17',()=>null),null);
});
