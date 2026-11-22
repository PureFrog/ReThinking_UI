// 관측소 원정 logic (app/core/game/*) and the built packs in public/game/packs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load} from './load-app.mjs';
const P=await load('core/game/pack'),E=await load('core/game/engine'),G=await load('core/game/grade'),B=await load('core/game/book'),R=await load('core/game/run');

// a tiny pack: 3 pre days, 30 play days, 20 epilogue days; A climbs 1%/day, Z falls 1%/day
function fixture(){
  const n=53,days=[];for(let i=0;i<n;i++)days.push(new Date(Date.UTC(2017,0,2+i)).toISOString().slice(0,10));
  const path=(start,step)=>days.map((d,i)=>{const raw=start*Math.pow(1+step,i),u=raw<1000?1:raw<5000?5:raw<10000?10:raw<50000?50:100,c=Math.round(raw/u)*u;return [d,c,c,c,c,100000]});
  return {v:1,id:'t',titleHidden:'사건 파일 · ????년',titleRevealed:'2017년 겨울',summaryRevealed:'',regime:'박스권',
    days:days.slice(3,33),preDays:3,epiDays:20,cash:1000,
    companies:[{code:'A',name:'가나전자',slot:'A',start:'held',qty:100},{code:'Z',name:'다라바이오',slot:'B',start:'held',qty:100},{code:'N',name:'마바소재',slot:'C',start:'reserve',qty:0}],
    prices:{A:path(10000,.01),Z:path(10000,-.01),N:path(5000,0)},index:days.map(d=>[d,700]),news:[],events:[
      {kind:'crash',d:days[10],code:'Z',ret:-5,idx:0,ar:-5,z:-3,verdict:'가치훼손',evidence:[]},
      {kind:'earnings',d:days[15],code:'A',fy:2016,f:7,prevF:5,items:[1,1,1,1,1,1,1,0,0],prevItems:null}],fscore:{},ohlson:{}};
}

test('tick size and ±30% limits follow the KOSDAQ table', () => {
  assert.deepEqual([P.tickOf(999),P.tickOf(1000),P.tickOf(4999),P.tickOf(5000),P.tickOf(10000),P.tickOf(50000)],[1,5,5,10,50,100]);
  const {upper,lower}=P.limits(10000);
  assert.equal(upper,13000);assert.equal(lower,7000);
  const l=P.limits(3455);assert.equal(l.upper%P.tickOf(l.upper),0);assert.equal(l.lower%P.tickOf(l.lower),0);
});

test('orders fill at the next open with the fee; nothing fills after the last day', () => {
  const p=fixture();
  const r=E.simulate(p,[{seq:0,tick:4,code:'A',side:'sell',qty:40},{seq:1,tick:29,code:'A',side:'sell',qty:10},{seq:2,tick:5,code:'Z',side:'sell',qty:999}]);
  const f=r.fills[0];
  assert.equal(f.tick,5);assert.equal(f.price,P.barAt(p,'A',5)[1]);
  assert.ok(Math.abs(f.fee-40*f.price*E.ENGINE.fee)<1e-6);
  assert.equal(r.positions.A.qty,60);
  assert.deepEqual(r.unfilled.map(u=>u.reason).sort(),['after_last_tick','insufficient_qty']);
  assert.equal(r.values.length,30);
  assert.equal(E.simulate(p,[]).values.length,30);
});

test('no buying into an upper-limit open', () => {
  const p=fixture();p.prices.N=p.prices.N.map((b,i)=>i===10?[b[0],6500,6500,6500,6500,1]:b);// day 10 opens +30%
  const r=E.simulate(p,[{seq:0,tick:6,code:'N',side:'buy',qty:1}]);// tick 6 → fills tick 7 = row 10
  assert.equal(r.unfilled[0].reason,'upper_limit_buy');
});

test('grading compares a choice with its opposite over 20 days; chips set the points', () => {
  const p=fixture();
  const keepUp=G.gradeDecision(p,{tick:5,code:'A',choice:'지킴',chips:3,kind:'crash'});
  assert.ok(keepUp.hold>15);assert.equal(keepUp.result,'hit');assert.equal(keepUp.points,30);
  const cutDown=G.gradeDecision(p,{tick:5,code:'Z',choice:'정리',chips:2,kind:'crash'});
  assert.equal(cutDown.result,'hit');assert.equal(cutDown.points,20);
  const cutUp=G.gradeDecision(p,{tick:5,code:'A',choice:'정리',chips:1,kind:'crash'});
  assert.equal(cutUp.result,'miss');assert.equal(cutUp.points,-10);
  const half=G.gradeDecision(p,{tick:5,code:'Z',choice:'절반',chips:1,kind:'crash'});
  assert.equal(half.result,'hit');assert.ok(Math.abs(half.mine-half.hold/2)<1e-9);
  const flat=G.gradeDecision(p,{tick:5,code:'N',choice:'지킴',chips:4,kind:'crash'});
  assert.equal(flat.result,'tie');assert.equal(flat.points,0);
  const run=G.scoreRun(p,[{tick:5,code:'A',choice:'지킴',chips:3,kind:'crash'},{tick:6,code:'Z',choice:'지킴',chips:1,kind:'crash'}]);
  assert.equal(run.points,20);assert.equal(run.bonus,G.CALIBRATION_BONUS);assert.equal(run.total,30);
  assert.deepEqual([1,2,3,4].map(G.chipsToConfidence),[2,3,4,5]);
});

test('the order book is steady, on the tick grid and inside the limits', () => {
  const p=fixture(),a=B.orderBook(p,'A',8),b=B.orderBook(p,'A',8);
  assert.deepEqual(a,b);
  for(const l of [...a.asks,...a.bids]){assert.equal(l.price%P.tickOf(l.price),0);assert.ok(l.price<=a.upper&&l.price>=a.lower);assert.ok(l.qty>0)}
  assert.ok(a.asks.every(l=>l.price>a.last)&&a.bids.every(l=>l.price<a.last));
});

test('chips, swaps, moments and replacements', () => {
  const p=fixture();
  assert.equal(R.canStake(10,4),true);assert.equal(R.canStake(10,5),false);assert.equal(R.canStake(2,3),false);assert.equal(R.canStake(5,0),false);
  assert.equal(R.chipsLeft([{chips:3},{chips:2}]),5);
  const swaps=[{tick:12,out:'Z',in:'N'}];
  assert.equal(R.heldAt(p,swaps,'Z',12),true);assert.equal(R.heldAt(p,swaps,'Z',13),false);
  assert.equal(R.heldAt(p,swaps,'N',12),false);assert.equal(R.heldAt(p,swaps,'N',13),true);
  assert.deepEqual(R.moments(p,(c,t)=>R.heldAt(p,[],c,t)).map(m=>m.kind),['crash','earnings']);
  assert.equal(R.moments(p,(c,t)=>R.heldAt(p,[{tick:2,out:'Z',in:'N'}],c,t)).length,1);
  assert.equal(R.pickReplacement(p,[],7).code,'N');assert.equal(R.pickReplacement(p,['N'],7),null);
  const o=R.ordersFor(p,{tick:10,code:'Z',choice:'정리'},100,0,'N');
  assert.equal(o[0].qty,100);assert.equal(o[1].code,'N');assert.ok(o[1].qty>0);
  assert.deepEqual(R.ordersFor(p,{tick:10,code:'Z',choice:'지킴'},100,0),[]);
  assert.equal(R.ordersFor(p,{tick:10,code:'Z',choice:'절반'},101,0)[0].qty,50);
  const path=R.paths(p,o);assert.ok(path.model>path.none,'selling the falling one on its 가치훼손 day beats holding');
});

test('the weekly 판 is the same all week and moves on Monday; the ghost is the last run of that 판', () => {
  const ids=['a','b','c'];
  assert.equal(R.weeklyPack(ids,'2026-11-16'),R.weeklyPack(ids,'2026-11-22'));
  assert.notEqual(R.weeklyPack(ids,'2026-11-22'),R.weeklyPack(ids,'2026-11-23'));
  assert.equal(R.weeklyPack([],'2026-11-16'),null);
  const h=[{pack:'a',week:'',decisions:[],total:10,at:'2026-11-01'},{pack:'a',week:'',decisions:[],total:20,at:'2026-11-08'},{pack:'b',week:'',decisions:[],total:5,at:'2026-11-09'}];
  assert.equal(R.ghostOf(h,'a').total,20);assert.equal(R.ghostOf(h,'a','2026-11-08').total,10);assert.equal(R.ghostOf(h,'c'),null);
});

test('blind titles: company names in headlines become their slot', () => {
  const p=fixture();
  assert.equal(P.maskTitle(p,'가나전자, 다라바이오와 계약'),'회사 A, 회사 B와 계약');
  assert.equal(P.fscoreOn({...p,fscore:{A:[{disc:'2017-03-31',fy:2016,f:7,items:[]},{disc:'2018-03-30',fy:2017,f:3,items:[]}]}},'A','2017-12-01').f,7);
});

test('built packs: blind, complete, 3~5 decisions each, no article text, balanced outcomes', () => {
  const dir=new URL('../public/game/packs/',import.meta.url);
  const idx=JSON.parse(fs.readFileSync(new URL('index.json',dir),'utf8'));
  assert.ok(idx.packs.length>=12);
  let cut=0,keep=0;
  for(const e of idx.packs){
    const p=JSON.parse(fs.readFileSync(new URL(e.id+'.json',dir),'utf8'));
    assert.equal(p.days.length,60);assert.ok(!/\d{4}/.test(p.titleHidden));assert.ok(!/(19|20)\d\d-\d\d/.test(p.id));
    const held=p.companies.filter(c=>c.start==='held');assert.equal(held.length,4);assert.ok(held.every(c=>c.qty>0));assert.ok(p.cash>=0);
    assert.ok(Math.abs(E.startValue(p)-10_000_000)<1);
    for(const c of p.companies){assert.equal(p.prices[c.code].length,p.preDays+p.days.length+p.epiDays);assert.ok(P.barAt(p,c.code,p.days.length-1+20))}
    const days=new Set(p.days);
    assert.ok(p.events.every(x=>days.has(x.d)));assert.ok(p.news.every(n=>days.has(n.d)&&!('body' in n)&&n.u.startsWith('https://n.news.naver.com/')));
    const ms=R.moments(p,(c,t)=>R.heldAt(p,[],c,t));assert.ok(ms.length>=3&&ms.length<=5,`${p.id}: ${ms.length} moments`);
    for(const m of ms){const h=G.holdReturn(p,m.code,m.tick);if(h<-G.TIE_PP)cut++;else if(h>G.TIE_PP)keep++}
  }
  assert.ok(Math.abs(cut-keep)<=Math.max(3,(cut+keep)*.2),`정리가 나음 ${cut} / 지킴이 나음 ${keep}`);
});

const PL=await load('core/game/play'),L=await load('content/game-lines');
test('a run: brief → flow → a moment stops time → decide → reveal; a 정리 swaps a waiting company in', () => {
  const p=fixture();
  let s=PL.startPlay(p,3);assert.equal(s.phase,'brief');
  s=PL.begin(s);assert.equal(s.phase,'flow');assert.equal(s.tick,0);
  s=PL.skipToMoment(p,s);assert.equal(s.phase,'moment');assert.equal(s.moment.kind,'crash');assert.equal(s.tick,7);
  assert.equal(PL.decide(p,s,'정리',5),s,'5 chips is over the stake limit');
  s=PL.decide(p,s,'정리',3);assert.equal(s.phase,'flow');assert.equal(s.decisions.length,1);
  assert.deepEqual(s.swaps,[{tick:7,out:'Z',in:'N'}]);assert.equal(s.orders.length,2);
  assert.deepEqual(PL.heldCodes(p,s,8).sort(),['A','N']);
  s=PL.skipToMoment(p,s);assert.equal(s.moment.kind,'earnings');assert.equal(s.moment.code,'A');
  s=PL.decide(p,s,'지킴',2);assert.equal(s.orders.length,2,'지킴 places no order');
  s=PL.skipToMoment(p,s);assert.equal(s.phase,'reveal');
  const G2=G.scoreRun(p,s.decisions);assert.equal(G2.items.length,2);
  let q=PL.togglePin(PL.begin(PL.startPlay(p,1)),'u1');q=PL.togglePin(q,'u2');q=PL.togglePin(q,'u3');q=PL.togglePin(q,'u4');
  assert.equal(q.pins.length,3);assert.equal(PL.togglePin(q,'u1').pins.length,2);
  assert.equal(PL.roomOf(p,0),0);assert.equal(PL.roomOf(p,29),2);
});

test('a real pack plays through to the reveal with every moment decided', () => {
  const idx=JSON.parse(fs.readFileSync(new URL('../public/game/packs/index.json',import.meta.url),'utf8'));
  for(const e of idx.packs){
    const p=JSON.parse(fs.readFileSync(new URL('../public/game/packs/'+e.id+'.json',import.meta.url),'utf8'));
    let s=PL.begin(PL.startPlay(p,PL.seedOf(p.id,0))),guard=0;
    while(s.phase!=='reveal'&&guard++<50){s=PL.skipToMoment(p,s);if(s.phase==='moment')s=PL.decide(p,s,guard%2?'정리':'지킴',1)}
    assert.equal(s.phase,'reveal',e.id);assert.ok(s.decisions.length>=3,`${e.id} ${s.decisions.length}`);
    assert.ok(R.chipsLeft(s.decisions)>=0);
  }
});

test('game lines keep the tone rules', () => {
  const BANNED=/괜찮|천천히|마음|네 속도|옆에 있|~|팔아|사세요|매수하세요|매도하세요|오를 거|오를걸|떨어질 거/;
  const ev=(e,dir)=>({kind:'crash',d:'',code:'A',ret:-8,idx:-2,ar:-6,z:-3,verdict:null,evidence:e?[{label:'x',dir}]:[]});
  const all=[...L.crashReads(ev(true,'부정'),{now:7,prev:5},2),...L.crashReads(ev(false),null,0),...L.crashReads({...ev(true,'긍정'),idx:1.2},{now:3,prev:3},0),
    ...L.earningsReads({kind:'earnings',d:'',code:'A',fy:1,f:3,prevF:8,items:[1,0,1,0,0,1,0,0,0],prevItems:[1,1,1,0,1,1,1,1,1]},3),...L.earningsReads({kind:'earnings',d:'',code:'A',fy:1,f:5,prevF:null,items:[],prevItems:null},0),
    ...L.revealReads(3,5,40),...L.revealReads(1,5,-10),...Object.values(L.COACH).flat()].map(r=>r.text);
  for(const t of all){assert.ok(t.length<=40,`${t.length}: ${t}`);assert.doesNotMatch(t,BANNED,t)}
});

const MT=await load('core/game/meta'),ST=await load('core/stamps');
test('G4: leans, trust, the garden look-alike, sample ranking, what came after, own trades', () => {
  const p=fixture();
  p.events[0].evidence=[{label:'다라바이오-담보 대출',dir:'부정'},{label:'x',dir:'부정'},{label:'y',dir:'긍정'}];
  const d={tick:7,code:'Z',choice:'정리',chips:2,kind:'crash'};
  assert.deepEqual(MT.leansOf(p,d),{tori:null,moa:'cut',luon:'keep'});
  const items=G.scoreRun(p,[d]).items;
  assert.deepEqual(MT.followsOf(p,items),[{who:'moa',result:'hit'}]);
  const t=MT.trustOf([{follow:[{who:'moa',result:'hit'},{who:'tori',result:'tie'}]},{follow:[{who:'moa',result:'miss'}]},{}]);
  assert.deepEqual(t.moa,{n:2,hit:1});assert.deepEqual(t.tori,{n:0,hit:0});
  const like=MT.similarOf(p,[d],[{holdingId:3,name:'삼성전자',model:'ohlson'},{holdingId:6,name:'강철',model:'crash'}]);
  assert.equal(like.signal.holdingId,6);assert.ok(like.why[0].includes('급락'));
  assert.equal(MT.similarOf(p,[d],[{holdingId:3,name:'x',model:'ohlson'}]),null);
  const r=MT.sampleRanking('abc','2026-11-16',{score:40,ret:-2});
  assert.ok(r.sample);assert.ok(r.rows.filter(x=>!x.me).every(x=>x.name.startsWith('예시·')));
  assert.deepEqual(MT.sampleRanking('abc','2026-11-16',{score:40,ret:-2}),r);
  const by=MT.rankBy(r.rows,'score');for(let i=1;i<by.length;i++)assert.ok(by[i-1].score>=by[i].score);
  p.news=[{d:p.days[9],at:'',t:'a',p:'',u:'1',codes:['Z']},{d:p.days[7],at:'',t:'b',p:'',u:'2',codes:['Z']},{d:p.days[29],at:'',t:'c',p:'',u:'3',codes:['Z']}];
  const a=MT.afterwards(p,d);assert.deepEqual(a.news.map(n=>n.u),['1']);
  let s=PL.begin(PL.startPlay(p,1));s=PL.trade(p,s,'A','sell',10);assert.equal(s.orders.length,1);
  assert.equal(PL.trade(p,s,'N','buy',1),s,'not held → no trade');
  assert.equal(E.simulate(p,s.orders,1).fills[0].qty,10);
});

test('G4: expedition stamps and weeks in a row', () => {
  assert.equal(ST.weeksInRow(['2026-11-02','2026-11-09','2026-11-16','2026-11-30']),3);
  assert.equal(ST.weeksInRow(['2026-11-02','2026-11-09','2026-11-16','2026-11-23','2026-11-23']),4);
  const base={judgments:0,graded:[],bestStreak:0,rewinds:0,cases:0,daysDone:0,seen:{cutaway:0,bury:0},calibration:null};
  assert.deepEqual(ST.newStamps({...base,expeditions:[{week:'2026-11-16',sureHit:true}]},[]),['expedition','expedition-sure']);
  assert.deepEqual(ST.newStamps(base,[]),[]);
});

test('a company I sold down to nothing has no moment left', () => {
  const p=fixture();
  let s=PL.begin(PL.startPlay(p,1));
  s=PL.trade(p,s,'Z','sell',100);// all of Z, fills on tick 1
  s=PL.skipToMoment(p,s);
  assert.equal(s.moment?.code,'A','the Z crash on tick 7 is skipped; the A report comes up');
});

test('2023~ packs: the new tick table, a KOSPI index, tori counts the tape when there is no F-score', () => {
  assert.deepEqual([1999,2000,4999,5000,19999,20000,50000,200000,500000].map(p=>P.tickOf(p,'2023')),[1,5,5,10,10,50,100,500,1000]);
  const l=P.limits(18000,'2023');assert.equal(l.upper%P.tickOf(l.upper,'2023'),0);assert.equal(l.lower%P.tickOf(l.lower,'2023'),0);
  const idx=JSON.parse(fs.readFileSync(new URL('../public/game/packs/index.json',import.meta.url),'utf8'));
  assert.ok(idx.packs.length>=20);assert.ok(idx.packs.some(p=>p.set==='2023-2024'));
  const newer=idx.packs.filter(p=>p.set==='2023-2024').map(e=>JSON.parse(fs.readFileSync(new URL('../public/game/packs/'+e.id+'.json',import.meta.url),'utf8')));
  assert.ok(newer.every(p=>p.ticks==='2023'));assert.ok(newer.some(p=>p.market==='KOSPI'));
  for(const p of newer){const b=B.orderBook(p,p.companies[0].code,10);for(const x of [...b.asks,...b.bids])assert.equal(x.price%P.tickOf(x.price,'2023'),0)}
  const r=L.crashReads({kind:'crash',d:'',code:'A',ret:-8,idx:.4,ar:-8,z:-3,verdict:null,evidence:[]},null,0,{ret20:-12.3,volX:3.24});
  assert.equal(r.find(x=>x.who==='tori').text,'20일 전보다 −12.30%. 거래량은 평소의 3.2배.');
});

const VF=await load('core/game/verify');
test('the server check replays a run and refuses what does not replay', () => {
  const p=fixture();
  let s=PL.begin(PL.startPlay(p,3));s=PL.skipToMoment(p,s);s=PL.decide(p,s,'정리',3);s=PL.skipToMoment(p,s);s=PL.decide(p,s,'지킴',2);
  const sub={pack:p.id,week:'2026-11-16',decisions:s.decisions,orders:s.orders,swaps:s.swaps};
  const v=VF.verifyRun(p,sub);assert.equal(v.ok,true);assert.equal(v.total,G.scoreRun(p,s.decisions).total);
  assert.equal(VF.verifyRun(p,{...sub,decisions:[...sub.decisions,{...sub.decisions[1],tick:20}]}).reason,'moment');
  assert.equal(VF.verifyRun(p,{...sub,decisions:sub.decisions.map(d=>({...d,chips:5}))}).reason,'chips');
  assert.equal(VF.verifyRun(p,{...sub,swaps:[{tick:7,out:'Z',in:'A'}]}).reason,'swap');
  assert.equal(VF.verifyRun(p,{...sub,pack:'x'}).reason,'pack');
});
