// 오늘의 관측소 content side (app/core/content, daily_quest_design 7): the fixtures rebuild the sample pack through the
// pipeline, the publish checks catch what must never reach a player, the live SEC and vendor adapters read their
// sources correctly (against a fake fetch — no network), and the model tasks' validators refuse bad replies.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const PL=await load('core/content/pipeline'),FX=await load('content/daily/solbit-sources'),C=await load('content/daily/solbit');
const SEC=await load('core/content/live/sec'),V=await load('core/content/live/vendors'),H=await load('core/content/live/http'),LT=await load('core/content/llm-tasks');
const M=await load('core/game/daily/model');
const P=C.SOLBIT;
const ctxOf=(routes,env={})=>({env:k=>({SEC_USER_AGENT:'rethink-test admin@example.invalid',MARKET_DATA_URL:'https://md.example',MARKET_DATA_KEY:'k',NEWS_API_URL:'https://news.example',NEWS_API_KEY:'k',...env})[k],
  now:()=>Date.now(),sleep:async()=>{},fetch:async(url,init)=>{const r=routes(String(url),init);const body=typeof r.body==='string'?r.body:JSON.stringify(r.body);
    return new Response(body,{status:r.status??200,headers:r.headers??{}})}});
const build=async(draft=FX.SOLBIT_DRAFT,obs=FX.SOLBIT_OBSERVATIONS,prov=FX.fixtureProviders())=>PL.buildPack(draft,await PL.gather(prov,draft,obs));

test('the fixtures rebuild the sample pack through the pipeline, and it passes every publish check', async () => {
  const {pack,issues}=await build();
  const errors=issues.filter(i=>i.level==='error');
  assert.deepEqual(errors,[],JSON.stringify(errors,null,1));
  assert.ok(PL.publishable(issues));
  assert.deepEqual(pack.prices,P.prices);assert.deepEqual(pack.index,P.index);assert.equal(pack.evalTick,P.evalTick);
  assert.deepEqual(pack.scenes,P.scenes);assert.deepEqual(pack.mentor,P.mentor);assert.deepEqual(pack.company,P.company);
  assert.deepEqual(pack.reveal,P.reveal);// 13F: two rows of the same CUSIP summed, the option row and the other issuer left out
  assert.equal(pack.currency,'원');assert.equal(pack.cash,P.cash);
});

test('the publish checks catch a future source, an unsourced or wrong number, a leak, a year, an estimate as fact', async () => {
  const d=structuredClone(FX.SOLBIT_DRAFT);const s1=d.scenes[0],c1=s1.cards[0];
  c1.fact='솔빛산업 지난 분기 영업이익 +19%';c1.claims[0].text='+19%';c1.claims[0].value=19;// wrong number
  s1.cards[1].fact+=' (2022년 서한)';// a year in play
  s1.cards[2].fact+=' · SLBT';// a ticker
  s1.cards[3].fact='회사 설명: 원가절감이 끝나면 9배 수준';s1.cards[3].compare='';// an estimate written as fact
  s1.cards[4].fact+=' · 거래량 3배';// a number with no source
  d.scenes[1].cards[0].sourceIds=['call'];// a source published only at scene 3
  const codes=(await build(d)).issues.filter(i=>i.level==='error').map(i=>i.code);
  for(const c of ['number','period','real-name','estimate','unsourced-number','future'])assert.ok(codes.includes(c),`${c} not caught: ${codes}`);
});

test('the check on what a hypothesis is checked against (feedback F2): the given parts are listed, no year in the labels', async () => {
  const d=structuredClone(FX.SOLBIT_DRAFT);
  d.scenes[0].observe={...d.scenes[0].observe,given:{target:'zz',period:'r1'}};
  d.scenes[1].observe={...d.scenes[1].observe,periods:[...d.scenes[1].observe.periods,{id:'y',label:'2026년 실적 발표 때'}]};
  d.scenes[2].observe={...d.scenes[2].observe,actual:{...d.scenes[2].observe.actual,'op@q9':{change:1,source:'x'}}};
  const issues=(await build(d)).issues.filter(i=>i.level==='error');
  assert.deepEqual(issues.filter(i=>i.code==='observe').map(i=>i.where),['장면 1','장면 3']);
  assert.ok(issues.some(i=>i.code==='period'&&i.where==='장면 2'));
});

test('the reveal reads at a glance (feedback F3): the event is two sentences at most', async () => {
  const d=structuredClone(FX.SOLBIT_DRAFT);
  d.reveal.event='경영진이 밝힌 기준을 넘는 가격에 인수했다. 심사 서류는 공개됐다. 첫 통합 실적은 목표의 60%였다.';
  assert.ok((await build(d)).issues.some(i=>i.code==='reveal-length'&&i.level==='error'));
  d.reveal.event='경영진이 밝힌 기준(10.5배)을 넘는 가격에 인수했다. 첫 통합 실적은 목표의 60%였다.';
  assert.ok(!(await build(d)).issues.some(i=>i.code==='reveal-length'));
});

test('the flow\'s headlines (feedback F4): on a trading day, known by its close, no name or year; the market rules come along', async () => {
  const d=structuredClone(FX.SOLBIT_DRAFT),day=d.scenes[1].date,src=FX.SOLBIT_OBSERVATIONS.find(o=>Date.parse(o.ref.publishedAt)<=Date.parse(`${d.scenes[0].date}T${d.sessionClose}`)).ref.sourceId;
  d.news=[{date:d.scenes[0].date,title:'포장재 업계, 원지 값 부담',source:'업계 전문지',sourceId:src}];
  let {pack,issues}=await build(d);assert.ok(PL.publishable(issues),JSON.stringify(issues.filter(i=>i.level==='error')));
  assert.deepEqual(pack.news,[{tick:P.scenes[0].tick,title:'포장재 업계, 원지 값 부담',source:'업계 전문지'}]);
  assert.equal(pack.market.fee,.001);assert.match(pack.market.label,/거래일 · 원/);
  d.news=[{date:day,title:'2024년 솔빛산업 공장 증설',source:'경제 신문',sourceId:'nope'},{date:'2001-01-01',title:'무역 지표',source:'경제 신문',sourceId:src}];
  const codes=(await build(d)).issues.filter(i=>i.level==='error').map(i=>i.code);
  for(const c of ['period','source','news-date'])assert.ok(codes.includes(c),`${c} not caught: ${codes}`);
});

test('the checks on the sign, the comparison basis, directions, one-sided scenes, adjusted prices and halts', async () => {
  const d=structuredClone(FX.SOLBIT_DRAFT);
  d.scenes[0].cards[4].claims[0].text='+7%';d.scenes[0].cards[4].fact=d.scenes[0].cards[4].fact.replace('−7%','+7%');d.scenes[0].cards[4].claims[0].value=-7;
  d.scenes[0].cards[0].compare='같은 분기';// a year-on-year number without its basis
  d.scenes[1].cards[3].fact='경쟁사도 협상 중이니 지금 매도해야 함';
  for(const c of d.scenes[2].cards)c.rel='support';
  let codes=(await build(d)).issues.filter(i=>i.level==='error').map(i=>i.code);
  for(const c of ['sign','basis','direction','one-reading'])assert.ok(codes.includes(c),`${c} not caught: ${codes}`);
  const adj=FX.fixtureProviders(),raw=adj.prices.series;adj.prices={...adj.prices,series:async q=>({...(await raw(q)),adjusted:true})};
  codes=(await build(undefined,undefined,adj)).issues.map(i=>i.code);assert.ok(codes.includes('adjusted'));
  const halt=FX.fixtureProviders(),raw2=halt.prices.series;
  halt.prices={...halt.prices,series:async q=>{const s=await raw2(q);return {...s,bars:s.bars.map(b=>b.d===FX.dayOf(41)&&q.instrumentId==='SAMPLE-SLBT'?{...b,v:0}:b)}}};
  codes=(await build(undefined,undefined,halt)).issues.map(i=>i.code);assert.ok(codes.includes('halt'));
});

test('dividends from the ledger are paid once, on the shares held into the ex-date', async () => {
  const prov=FX.fixtureProviders();prov.actions={id:'x',actions:async()=>[{instrumentId:'SAMPLE-SLBT',kind:'dividend',exDate:FX.dayOf(60),payDate:FX.dayOf(70),ratio:null,amount:500,currency:'KRW'}]};
  const {pack}=await build(undefined,undefined,prov);
  assert.deepEqual(pack.dividends,[{tick:60,perShare:500}]);
  const sell=[{scene:'s1',fraction:'1/2'},{scene:'s2',fraction:'0'},{scene:'s3',fraction:'0'}];
  const a=M.performance(pack,sell),b=M.performance({...pack,dividends:[]},sell);
  assert.ok(Math.abs((a.end-b.end)-40*500)<1e-6);// 40 shares were held into the ex-date
  const h=M.performance(pack,[{scene:'s1',fraction:'0'},{scene:'s2',fraction:'0'},{scene:'s3',fraction:'0'}]);assert.ok(Math.abs(h.excess)<1e-9);
});

test('a portrait shows only with checked rights; a real master needs a source; 13F without a matching CUSIP waits', async () => {
  const prov=FX.fixtureProviders();
  prov.philosophy={id:'x',mentor:async()=>({...FX.SOLBIT_MENTOR,real:true,portrait:{assetId:'p',uri:'https://example.invalid/p.jpg',author:'A',license:'CC BY',rightsChecked:false,alt:'초상'}}),
    principles:async()=>[{...FX.SOLBIT_PRINCIPLE,source:{title:'',locator:'',publishedAt:'',url:null,quote:null}}]};
  const {pack,issues}=await build(undefined,undefined,prov);
  assert.equal(pack.mentor.portrait,undefined);assert.ok(issues.some(i=>i.code==='portrait'));assert.ok(issues.some(i=>i.code==='principle-source'&&i.level==='error'));
  const d=structuredClone(FX.SOLBIT_DRAFT);d.instrument.cusip='NOPE00000';
  const r=await build(d);assert.deepEqual(r.pack.reveal.holdings,[]);assert.ok(r.issues.some(i=>i.code==='holdings'));
});

test('SEC live adapters: User-Agent required, facts as known by asOf, 13F by CUSIP with amendments and units', async () => {
  H.clearCache();
  assert.equal(SEC.cik10('320193'),'0000320193');
  const noUa=ctxOf(()=>({body:{}}),{SEC_USER_AGENT:undefined});
  await assert.rejects(SEC.secFilings(noUa).filings({cik:'1',asOf:'2025-01-01'}),/SEC_USER_AGENT/);
  const seen=[];
  const ctx=ctxOf((url,init)=>{seen.push([url,new Headers(init?.headers).get('user-agent')]);
    if(url.includes('/submissions/CIK0000000002'))return {body:{filings:{recent:{accessionNumber:['a-1','a-2'],filingDate:['2024-02-01','2024-08-01'],form:['10-K','10-Q/A'],reportDate:['2023-12-31','2024-06-30'],primaryDocument:['k.htm','q.htm']}}}};
    if(url.includes('/companyfacts/CIK0000000002'))return {body:{facts:{'us-gaap':{Revenues:{label:'Revenue',units:{USD:[
      {end:'2023-12-31',val:100,accn:'a-1',fy:2023,fp:'FY',form:'10-K',filed:'2024-02-01'},{end:'2023-12-31',val:90,accn:'a-9',fy:2023,fp:'FY',form:'10-K/A',filed:'2024-09-01'}]}}}}}};
    return {status:404,body:{}}});
  const f=await SEC.secFilings(ctx).filings({cik:'2',forms:['10-K','10-Q'],asOf:'2024-06-01'});
  assert.deepEqual(f.map(x=>x.accession),['a-1']);// the amendment came after asOf
  const facts=await SEC.secFilings(ctx).facts({cik:'2',concepts:['Revenues'],asOf:'2024-06-01'});
  assert.deepEqual(facts.map(x=>x.value),[100]);// the restated 90 was not known yet
  assert.equal(SEC.asKnown([...facts,{...facts[0],value:90,filedAt:'2024-09-01'}],'us-gaap:Revenues','2023-12-31','2024-12-31').value,90);
  assert.ok(seen.every(([,ua])=>ua==='rethink-test admin@example.invalid'));
  const xml='<ns1:informationTable><ns1:infoTable><ns1:nameOfIssuer>APPLE INC</ns1:nameOfIssuer><ns1:titleOfClass>COM</ns1:titleOfClass><ns1:cusip>037833100</ns1:cusip><ns1:value>1,234</ns1:value>'
    +'<ns1:shrsOrPrnAmt><ns1:sshPrnamt>5,000</ns1:sshPrnamt><ns1:sshPrnamtType>SH</ns1:sshPrnamtType></ns1:shrsOrPrnAmt></ns1:infoTable>'
    +'<ns1:infoTable><ns1:nameOfIssuer>APPLE INC</ns1:nameOfIssuer><ns1:titleOfClass>CALL</ns1:titleOfClass><ns1:cusip>037833100</ns1:cusip><ns1:value>10</ns1:value><ns1:shrsOrPrnAmt><ns1:sshPrnamt>100</ns1:sshPrnamt><ns1:sshPrnamtType>SH</ns1:sshPrnamtType></ns1:shrsOrPrnAmt><ns1:putCall>Call</ns1:putCall></ns1:infoTable></ns1:informationTable>';
  const rows=SEC.parseInfoTable(xml);
  assert.deepEqual(rows.map(r=>[r.cusip,r.value,r.shares,r.putCall]),[['037833100',1234,5000,null],['037833100',10,100,'CALL']]);
  assert.equal(SEC.valueUsdOf(1234,'2022-11-14'),1234000);assert.equal(SEC.valueUsdOf(1234,'2023-02-14'),1234);
  assert.equal(SEC.amendmentTypeOf('<amendmentInfo><amendmentType>RESTATEMENT</amendmentType></amendmentInfo>'),'RESTATEMENT');
  const row=(cusip,shares)=>({cusip,shares});
  const merged=SEC.mergeQuarter([{filedAt:'2025-02-14',amendment:false,amendmentType:null,rows:[row('A',10),row('B',5)]},
    {filedAt:'2025-02-20',amendment:true,amendmentType:'NEW HOLDINGS',rows:[row('C',1)]},{filedAt:'2025-03-01',amendment:true,amendmentType:'RESTATEMENT',rows:[row('A',12)]}]);
  assert.deepEqual(merged,[row('A',12)]);
  const added=SEC.mergeQuarter([{filedAt:'2025-02-14',amendment:false,amendmentType:null,rows:[row('A',10)]},{filedAt:'2025-02-20',amendment:true,amendmentType:'NEW HOLDINGS',rows:[row('C',1)]}]);
  assert.deepEqual(added.map(r=>r.cusip),['A','C']);
});

test('vendor adapters: keys from env, wrong shapes refused, news reprints folded, 429 retried with Retry-After', async () => {
  H.clearCache();
  let calls=0;
  const ctx=ctxOf((url,init)=>{calls++;assert.equal(new Headers(init?.headers).get('authorization'),'Bearer k');
    if(url.startsWith('https://md.example/bars')){if(calls===1)return {status:429,headers:{'retry-after':'1'},body:{}};
      return {body:{instrumentId:'X',exchange:'XNYS',currency:'USD',session:'regular',adjusted:false,bars:[{d:'2025-01-03',o:10,h:11,l:9,c:10.5,v:100},{d:'2025-01-02',o:9,h:10,l:8,c:9.5,v:100}]}}}
    if(url.startsWith('https://news.example'))return {body:{items:[{id:'a',title:'[속보] 회사 A, 공장 증설',publisher:'P1',publishedAt:'2025-01-02T01:00:00Z',url:'u1'},
      {id:'b',title:'회사 A 공장 증설',publisher:'P2',publishedAt:'2025-01-02T03:00:00Z',url:'u2'}],cursor:null}};
    return {status:404,body:{}}});
  const s=await V.vendorPrices(ctx).series({instrumentId:'X',exchange:'XNYS',from:'2025-01-01',to:'2025-01-31'});
  assert.equal(calls,2);assert.deepEqual(s.bars.map(b=>b.d),['2025-01-02','2025-01-03']);
  const n=await V.vendorNews(ctx).search({entity:'X',since:'2025-01-01',until:'2025-01-31'});
  assert.deepEqual(n.items.map(x=>[x.id,x.dupOf,x.usage]),[['a',null,'metadata-only'],['b','a','metadata-only']]);
  H.clearCache();
  const bad=ctxOf(()=>({body:{currency:'USD',exchange:'X',bars:[{d:'2025-01-02',o:10,h:9,l:8,c:10,v:1}]}}));
  await assert.rejects(V.vendorPrices(bad).series({instrumentId:'X',exchange:'X',from:'a',to:'b'}),e=>e.code==='shape');
  await assert.rejects(V.vendorPrices(ctxOf(()=>({body:{}}),{MARKET_DATA_URL:undefined})).series({instrumentId:'Y',exchange:'X',from:'a',to:'b'}),/MARKET_DATA_URL/);
});

test('model tasks: the Toulmin reply must quote the player and cite visible cards; hints carry no direction', async () => {
  const q=(await load('core/game/daily/course')).questById('q2'),s=P.scenes[0],f={...M.blankFields(),hypo:'약속한 10배보다 비싼 12배라서 신뢰가 약해졌다.',reason:'12배는 확정된 계약 가격이다.',ev:'c3'};
  const i=LT.toulminInput(q,s,s.cards,P.mentor.principle,f,null,'run1');
  assert.deepEqual(i.activeAxes,['philosophy','evidence']);assert.equal(i.userSpans.evidenceCard,'c3');
  const good={dimensions:[{key:'evidence',grade:2,quote:'12배는 확정된 계약 가격이다.',evidenceIds:['c3'],reason:'자료를 정확히 썼어요.'},
    {key:'philosophy',grade:3,quote:'약속한 10배보다 비싼 12배라서',evidenceIds:['c2','c3'],reason:'명제에 대어 봤어요.'}],insufficientEvidence:false};
  const ok=LT.checkToulmin(good,i);assert.equal(ok.ok,true);assert.deepEqual(ok.dims.map(d=>d.key),['philosophy','evidence']);
  const bad=(patch)=>LT.checkToulmin({...good,dimensions:good.dimensions.map((d,k)=>k===1?{...d,...patch}:d)},i).ok;
  assert.equal(bad({quote:'회사는 망할 것이다'}),false);// not the player's words
  assert.equal(bad({evidenceIds:['e2']}),false);// a card from a later scene
  assert.equal(bad({grade:4}),false);
  assert.equal(LT.checkToulmin({...good,dimensions:[...good.dimensions,{key:'logic',grade:1,quote:'',evidenceIds:[],reason:'x'}]},i).ok,false);// an axis not asked for
  assert.equal(LT.checkHint({question:'이 자료에서 확정된 것은 무엇일까?'}).ok,true);
  assert.equal(LT.checkHint({question:'지금 매도해야 하지 않을까?'}).ok,false);
  assert.equal(LT.checkHint({question:'확정된 것은 무엇일까'}).ok,false);
  const ei={sceneAsOf:'2025-04-28T15:30:00+09:00',principle:'p',aliases:{'Solbit Industries':'솔빛산업'},fragments:[{sourceId:'s1',text:'OI +18% yoy',publishedAt:'2025-03-14'}]};
  assert.equal(LT.checkEditorCard({cardTextKo:'영업이익 +18%',compareKo:'전년 대비',sourceIds:['s1'],numericClaims:[{text:'+18%',sourceId:'s1',value:18,unit:'%'}],termGlossary:[]},ei).ok,true);
  assert.equal(LT.checkEditorCard({cardTextKo:'영업이익 +18%, 매출 +5%',compareKo:'',sourceIds:['s1'],numericClaims:[{text:'+18%',sourceId:'s1',value:18,unit:'%'}],termGlossary:[]},ei).why,'unsourced number');
  assert.equal(LT.checkEditorCard({cardTextKo:'Solbit Industries 영업이익 +18%',compareKo:'',sourceIds:['s1'],numericClaims:[{text:'+18%',sourceId:'s1',value:18,unit:'%'}],termGlossary:[]},ei).why,'real name');
  assert.equal(LT.checkExplain({text:'목표의 70%를 넘었어요.'},'목표의 60% 달성').ok,false);
  assert.equal(LT.checkExtract({claim:'12배라서 신뢰가 약해졌다',target:'3개월 안 10% 상승',horizon:'',direction:'상승',evidenceRefs:[]},'약속한 10배보다 비싼 12배라서 신뢰가 약해졌다.').ok,false);
});

test('a split during play: raw prices stay, the ledger multiplies the shares once, holding is worth the same', async () => {
  const prov=FX.fixtureProviders(),raw=prov.prices.series;
  // a 2:1 split on tick 60: raw prices halve from that day on
  prov.prices={...prov.prices,series:async q=>{const s=await raw(q);if(q.instrumentId!=='SAMPLE-SLBT')return s;
    return {...s,bars:s.bars.map(b=>b.d>=FX.dayOf(60)?{...b,o:b.o/2,h:b.h/2,l:b.l/2,c:b.c/2}:b)}}};
  prov.actions={id:'x',actions:async()=>[{instrumentId:'SAMPLE-SLBT',kind:'split',exDate:FX.dayOf(60),payDate:null,ratio:2,amount:null,currency:null}]};
  const {pack,issues}=await build(undefined,undefined,prov);
  assert.ok(PL.publishable(issues),JSON.stringify(issues.filter(i=>i.level==='error')));
  assert.deepEqual(pack.splits,[{tick:60,ratio:2}]);assert.equal(pack.prices[70][1],P.prices[70][1]/2);
  const hold=[{scene:'s1',fraction:'0'},{scene:'s2',fraction:'0'},{scene:'s3',fraction:'0'}];
  const a=M.performance(pack,hold),b=M.performance(P,hold);
  assert.ok(Math.abs(a.ret-b.ret)<1e-9);assert.equal(M.fval(a.qty),160);
  // selling half at scene 3 (after the split) sells half of 160
  const sell=M.fillsOf(pack,[{scene:'s1',fraction:'0'},{scene:'s2',fraction:'0'},{scene:'s3',fraction:'1/2'}]);
  assert.equal(M.fval(sell.fills[2].sold),80);
  const same=M.performance(P,[{scene:'s1',fraction:'0'},{scene:'s2',fraction:'0'},{scene:'s3',fraction:'1/2'}]);
  assert.ok(Math.abs(M.performance(pack,[{scene:'s1',fraction:'0'},{scene:'s2',fraction:'0'},{scene:'s3',fraction:'1/2'}]).ret-same.ret)<1e-6);
  assert.equal(M.fval(M.leftAfter(pack,[],'1/4',70)),120);
});

test('the editing model drafts marked cards from their fragments only; a bad draft is dropped; a good one waits for review', async () => {
  const d=structuredClone(FX.SOLBIT_DRAFT),obs=FX.SOLBIT_OBSERVATIONS.map(o=>o.ref.sourceId==='q-prev'?{...o,text:'Operating income rose 18% year on year (example).'}:o);
  d.scenes[0].cards[0]={...d.scenes[0].cards[0],llm:true,fact:'',compare:''};
  const good={id:'m',run:async()=>({json:{cardTextKo:'솔빛산업 지난 분기 영업이익 +18%',compareKo:'전년 같은 분기 대비',sourceIds:['q-prev'],numericClaims:[{text:'+18%',sourceId:'q-prev',value:18,unit:'%'}],termGlossary:[]},model:'m',usage:{input:0,output:0},ms:0})};
  const r=await PL.draftCards(good,d,obs,'p');
  assert.equal(r.draft.scenes[0].cards[0].fact,'솔빛산업 지난 분기 영업이익 +18%');assert.ok(r.issues.some(i=>i.code==='llm-draft'&&i.level==='warning'));
  const built=PL.buildPack(r.draft,await PL.gather(FX.fixtureProviders(),r.draft,obs));assert.ok(PL.publishable([...r.issues,...built.issues]));
  const leaky={id:'m',run:async()=>({json:{cardTextKo:'Solbit Industries 영업이익 +18%, 매출 +3%',compareKo:'',sourceIds:['q-prev'],numericClaims:[{text:'+18%',sourceId:'q-prev',value:18,unit:'%'}],termGlossary:[]},model:'m',usage:{input:0,output:0},ms:0})};
  const bad=await PL.draftCards(leaky,d,obs,'p');assert.equal(bad.draft.scenes[0].cards[0].fact,'');assert.ok(bad.issues.some(i=>i.code==='llm-refused'));
  const none=await PL.draftCards(good,d,FX.SOLBIT_OBSERVATIONS,'p');assert.ok(none.issues.some(i=>i.code==='llm-no-fragment'));
});

const SP4=await load('content/daily/server-packs');FX.addFixtureSeries('SAMPLE-DAON',SP4.SOLBIT_L4.others[0].prices);
test('the pipeline builds a pack with a comparison company and checks its names too', async () => {
  const d=structuredClone(FX.SOLBIT_DRAFT);d.others=[{slot:'B',instrumentId:'SAMPLE-DAON',exchange:'XKRX',alias:'다온포장',realNames:['Daon Packaging'],business:'경쟁사',qty:60}];
  d.scenes[1].target='B';
  const {pack,issues}=await build(d);assert.ok(PL.publishable(issues),JSON.stringify(issues.filter(i=>i.level==='error')));
  const C4=await load('content/daily/solbit');
  assert.deepEqual(pack.others[0].prices,SP4.SOLBIT_L4.others[0].prices);assert.equal(pack.scenes[1].target,'B');
  d.scenes[0].cards[0].fact+=' · Daon Packaging';d.scenes[2].target='C';
  const codes=(await build(d)).issues.filter(i=>i.level==='error').map(i=>i.code);
  assert.ok(codes.includes('real-name'));assert.ok(codes.includes('target'));
});

test('a comparison company has its own ledger: its split and dividend are applied once and paid on what it still holds', async () => {
  const C4=await load('content/daily/solbit');
  const prov=FX.fixtureProviders(),raw=prov.prices.series;
  prov.prices={...prov.prices,series:async q=>{const s=await raw(q);if(q.instrumentId!=='SAMPLE-DAON')return s;
    return {...s,bars:s.bars.map(b=>b.d>=FX.dayOf(60)?{...b,o:b.o/2,h:b.h/2,l:b.l/2,c:b.c/2}:b)}}};
  prov.actions={id:'x',actions:async q=>q.instrumentId==='SAMPLE-DAON'?[{instrumentId:'SAMPLE-DAON',kind:'split',exDate:FX.dayOf(60),payDate:null,ratio:2,amount:null,currency:null},
    {instrumentId:'SAMPLE-DAON',kind:'dividend',exDate:FX.dayOf(70),payDate:FX.dayOf(75),ratio:null,amount:100,currency:'KRW'}]:[]};
  const d=structuredClone(FX.SOLBIT_DRAFT);d.others=[{slot:'B',instrumentId:'SAMPLE-DAON',exchange:'XKRX',alias:'다온포장',realNames:[],business:'경쟁사',qty:60}];d.scenes[1].target='B';
  const {pack,issues}=await build(d,undefined,prov);assert.ok(PL.publishable(issues),JSON.stringify(issues.filter(i=>i.level==='error')));
  assert.deepEqual(pack.others[0].splits,[{tick:60,ratio:2}]);assert.deepEqual(pack.others[0].dividends,[{tick:70,perShare:100}]);assert.equal(pack.splits,undefined);
  const plain={...pack,others:[{...pack.others[0],prices:SP4.SOLBIT_L4.others[0].prices,splits:undefined,dividends:undefined}]};
  const hold=[{scene:'s1',fraction:'0'},{scene:'s2',fraction:'0'},{scene:'s3',fraction:'0'}];
  // holding: the split leaves the value alone; the dividend adds 60×2 shares × 100
  assert.ok(Math.abs(M.performance(pack,hold).hold-(M.performance(plain,hold).hold+120*100))<1e-6);
  // selling half of 다온포장 at scene 2 (before the split): 30 left → 60 after it → paid 60 × 100
  const half=[{scene:'s1',fraction:'0'},{scene:'s2',fraction:'1/2'},{scene:'s3',fraction:'0'}];
  assert.ok(Math.abs(M.performance(pack,half).end-(M.performance(plain,half).end+60*100))<1e-6);
  assert.equal(M.fval(M.leftAfter(pack,half.slice(0,2),'1/2',pack.scenes[2].tick,'B')),30);// 60 after the split, half of it
});

test('operations: every model call is one row (no text), summed per task and model; the revision rate', async () => {
  const O=await load('core/content/ops');const rows=[];
  let n=0;const llm={id:'x',run:async t=>{if(++n===2)throw new Error('timeout');return {json:{},model:'m1',usage:{input:10,output:5},ms:100*n}}};
  const w=O.withOps(llm,'quest-play',r=>rows.push(r));
  await w.run('hint','v',{secret:'player text'},{},'');await assert.rejects(w.run('hint','v',{},{},''));await w.run('hint','v',{},{},'');
  assert.equal(rows.length,3);assert.ok(rows.every(r=>!JSON.stringify(r).includes('player text')));
  rows.push(O.refusedRow('quest-settle','toulmin','m2','quote'));
  const s=O.summarizeOps(rows);
  const h=s.find(x=>x.task==='hint'&&x.model==='m1');assert.deepEqual([h.calls,h.avgMs,h.input],[2,200,20]);
  assert.equal(s.find(x=>x.model==='?').failures,1);assert.equal(s.find(x=>x.task==='toulmin').failRate,1);
  assert.deepEqual(O.revisionRate([{drafted:4,edited:1},{drafted:0,edited:0}]),{drafted:4,edited:1,rate:.25});assert.equal(O.revisionRate([]).rate,null);
});

test('a reply that fails its check is counted as a failure too (hint with a direction, a Toulmin quote that is not the player\'s)', async () => {
  const LT=await load('core/content/llm-tasks'),O=await load('core/content/ops');const rows=[];
  const say=json=>({id:'x',run:async()=>({json,model:'m',usage:{input:1,output:1},ms:5})});
  const llm=O.withOps(say({question:'지금 매도해야 하지 않을까?'}),'quest-play',r=>rows.push(r));
  const h=await LT.hintQuestion(llm,{activeField:'hypo',label:'가설',principle:'p',ask:'a',visibleCards:[],draft:''},'고정 질문?',(t,m,w)=>rows.push(O.refusedRow('quest-play',t,m,w)));
  assert.equal(h.fromModel,false);assert.equal(h.question,'고정 질문?');
  assert.deepEqual(rows.map(r=>[r.task,r.ok]),[['hint',true],['hint',false]]);assert.match(rows[1].error,/refused: direction/);
  assert.equal(O.summarizeOps(rows)[0].failures,1);
});
