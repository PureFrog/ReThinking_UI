// Holdings coming in from a brokerage (멘토링 2026-11-22, app/core/holdings-in.ts): one standard line for every source,
// untrusted messages cleaned, the buying day asked once, the account as the garden's source of truth, the MTS badges
// matching the garden's notes, and the embed handshake.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const I=await load('core/holdings-in'),E=await load('core/embed'),A=await load('content/broker/demo-account'),B=await load('content/broker/badges'),S=await load('content/signals');
const TODAY='2026-11-20',kind=()=>0;

test('cleanStd keeps well-formed lines only, one per code', () => {
  const got=I.cleanStd([
    {code:'005930',name:' 삼성 전자 ',market:'KOSPI',quantity:3.7,avgPrice:70000.4,buyDate:'2026-01-02',lastPrice:71000},
    {code:'005930',name:'dup',market:'KOSPI',quantity:1,avgPrice:1},
    {code:'12345',name:'짧은 코드',market:'KOSPI',quantity:1,avgPrice:1},
    {code:'035720',name:'카카오',market:'NYSE',quantity:1,avgPrice:1},
    {code:'035420',name:'NAVER',market:'KOSPI',quantity:0,avgPrice:1},
    {code:'000660',name:'SK하이닉스',market:'KOSPI',quantity:2,avgPrice:150000,buyDate:'어제'},
    null,'x']);
  assert.deepEqual(got,[
    {code:'005930',name:'삼성 전자',market:'KOSPI',quantity:3,avgPrice:70000,buyDate:'2026-01-02',lastPrice:71000},
    {code:'000660',name:'SK하이닉스',market:'KOSPI',quantity:2,avgPrice:150000,buyDate:null}]);
  assert.deepEqual(I.cleanStd('nope'),[]);
});

test('cleanInput needs a known source; focus only on a stock that came', () => {
  assert.equal(I.cleanInput({source:'email',holdings:[]}),null);
  const ok=I.cleanInput({source:'mts',broker:'RT증권',focus:'999999',holdings:A.DEMO_ACCOUNT.holdings.map(A.toStd)});
  assert.equal(ok.holdings.length,8);assert.equal(ok.focus,null);
  assert.equal(I.cleanInput({source:'mts',focus:'035720',holdings:A.DEMO_ACCOUNT.holdings.map(A.toStd)}).focus,'035720');
});

test('the buying day is asked once: answered codes are not asked again', () => {
  const list=A.DEMO_ACCOUNT.holdings.map(A.toStd);
  assert.deepEqual(I.needsDate(list).map(h=>h.code),['105560','196170']);
  const known={'105560':I.heldBack('quarter',TODAY)};
  assert.equal(known['105560'],'2026-08-22');
  assert.deepEqual(I.needsDate(list,known).map(h=>h.code),['196170']);
  assert.equal(I.withDates(list,known).find(h=>h.code==='105560').buyDate,'2026-08-22');
  // a day the broker sent is never replaced
  assert.equal(I.withDates(list,{'005930':'2020-01-01'}).find(h=>h.code==='005930').buyDate,'2026-06-10');
});

test('stdToHoldings: the account is the source of truth, a kept stock keeps its tree', () => {
  const list=A.DEMO_ACCOUNT.holdings.map(A.toStd);
  const a=I.stdToHoldings([],list,[0,1,2,3,4,5,6,7,8],kind,TODAY,1000);
  assert.equal(a.holdings.length,8);assert.equal(a.planted.length,8);
  const sam=a.holdings.find(h=>h.code==='005930');
  assert.equal(sam.rate,-6.8);assert.equal(sam.price,76400);assert.equal(sam.date,'2026-06-10');assert.equal(sam.real,undefined);
  assert.equal(a.holdings.find(h=>h.code==='035720').lossDays,60);
  // next open: 카카오 sold in the account, a new stock bought
  const next=[...list.filter(h=>h.code!=='035720'),{code:'068270',name:'셀트리온',market:'KOSPI',quantity:2,avgPrice:170000,buyDate:'2026-11-01',lastPrice:178300}];
  const b=I.stdToHoldings(a.holdings,next,[0,1,2,3,4,5,6,7,8],kind,TODAY,2000);
  assert.equal(b.holdings.some(h=>h.code==='035720'),false);
  assert.equal(b.holdings.find(h=>h.code==='005930').id,sam.id);
  assert.equal(b.holdings.find(h=>h.code==='005930').plot,sam.plot);
  const cel=b.planted.find(h=>h.code==='068270');assert.ok(cel);
  assert.equal(new Set(b.holdings.map(h=>h.plot)).size,b.holdings.length);
  // no plot left: the line waits
  assert.equal(I.stdToHoldings([],list,[0,1],kind,TODAY).left.length,6);
});

test('other sources come through the same adapter', () => {
  const m=I.fromManual([{code:'005930',name:'삼성전자',date:'2026-02-03',quantity:2,price:70000}],()=>'KOSPI');
  assert.deepEqual(m,[{code:'005930',name:'삼성전자',market:'KOSPI',quantity:2,avgPrice:70000,buyDate:'2026-02-03'}]);
  const c=I.fromCapture([{name:'카카오',rate:-10,quantity:4,price:50000},{name:'없는회사',rate:1}],n=>n==='카카오'?{code:'035720',name:'카카오',market:'KOSPI'}:null);
  assert.deepEqual(c,[{code:'035720',name:'카카오',market:'KOSPI',quantity:4,avgPrice:50000,buyDate:null,lastPrice:45000}]);
});

test('MTS badges are the notes the garden opens with', () => {
  const list=A.DEMO_ACCOUNT.holdings.map(A.toStd),b=B.badgesFor(list,TODAY);
  assert.equal(b['005930'].label,'급락 감지');assert.equal(b['035720'].label,'서서히 악화');
  assert.equal(b['000660'],undefined);
  const {holdings}=I.stdToHoldings([],list,list.map((_,i)=>i),kind,TODAY,1);
  const garden=S.signalProvider.today(holdings,TODAY).filter(s=>s.loss);
  for(const s of garden){const code=holdings.find(h=>h.id===s.holdingId).code;assert.equal(b[code].model,s.model);assert.equal(b[code].headline,s.headline)}
  assert.equal(Object.keys(b).length,garden.length);
  // a badge never tells the player to buy or sell
  for(const x of Object.values(b))assert.doesNotMatch(x.label+x.headline,/팔아|사세요|매수하|매도하|오를/);
});

test('embed handshake: only a well-formed holdings message is read', () => {
  assert.equal(E.isReadyMsg(E.readyMsg()),true);
  const msg=E.holdingsMsg({source:'mts',broker:'RT증권',holdings:A.DEMO_ACCOUNT.holdings.map(A.toStd)});
  assert.equal(E.readHoldingsMsg(msg).holdings.length,8);
  assert.equal(E.readHoldingsMsg({...msg,v:2}),null);
  assert.equal(E.readHoldingsMsg({type:'other'}),null);
  assert.equal(E.readHoldingsMsg('x'),null);
});

test('the demo account names no real brokerage', () => {
  const text=JSON.stringify({b:A.BROKER,a:A.DEMO_ACCOUNT});
  assert.doesNotMatch(text,/미래에셋|키움|삼성증권|한국투자|NH투자|KB증권|토스증권|신한투자|대신증권|mirae/i);
  assert.match(A.BROKER.demo,/가상 증권사 데모 화면/);
});
