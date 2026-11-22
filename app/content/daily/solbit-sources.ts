// Fixture data for the sample case (daily_quest_design 7: "fixture / live 구현을 같은 계약으로 교체"). Every port answers
// with made-up data in the live shape, so the whole content pipeline runs without a key, and the sample pack in
// solbit.ts can be rebuilt from raw sources (tests/content-pipeline.test.mjs). Nothing here is a real company, person,
// filing, holding or article: the trading days are a plain weekday calendar from 2025-03-03 and every title says 예시.
import type {Ctx,DayBar,Holding13F,LLMProvider,Mentor,NewsItem,Principle,Providers,SourceRef} from '../../core/content/ports';
import type {EditorDraft,Observation} from '../../core/content/pipeline';
import {SOLBIT} from './solbit';
import {TRIAL_JUDGE} from '../../core/game/daily/judge';
import {blankFields,type Bar,type FieldKey,type QuestDef} from '../../core/game/daily/model';

// trading days: weekdays from 2025-03-03 (five extra days before the pack's first day, to exercise the slicing)
const EXTRA=5;
const WEEKDAYS=(()=>{const out:string[]=[];for(let d=Date.parse('2025-02-17T00:00:00Z');out.length<200;d+=864e5)if(![0,6].includes(new Date(d).getUTCDay()))out.push(new Date(d).toISOString().slice(0,10));return out})();
const ZERO=WEEKDAYS.indexOf('2025-03-03');
// tick 0 of the sample pack is 2025-03-03; negative ticks are the days before it
export const dayOf=(t:number)=>WEEKDAYS[ZERO+t];
const tickDates=Array.from({length:SOLBIT.prices.length+EXTRA+3},(_,k)=>dayOf(k-EXTRA));
const at=(t:number,hm:string)=>`${dayOf(t)}T${hm}:00+09:00`;
const company:DayBar[]=tickDates.map((d,k)=>{const t=k-EXTRA,p=SOLBIT.prices[Math.max(0,Math.min(SOLBIT.prices.length-1,t))],o=p[0],c=p[1];
  return {d,o,h:Math.max(o,c)+50,l:Math.min(o,c)-50,c,v:t>=0&&t<SOLBIT.prices.length?120000+((t*7919)%50000):90000}});
// more instruments for a test (the level packs' rival lives on the server only, so the tests hand its prices in)
const EXTRA_SERIES=new Map<string,DayBar[]>();
export function addFixtureSeries(id:string,prices:Bar[]){EXTRA_SERIES.set(id,tickDates.map((d,k)=>{const t=k-EXTRA,p=prices[Math.max(0,Math.min(prices.length-1,t))],o=p[0],c=p[1];return {d,o,h:Math.max(o,c)+50,l:Math.min(o,c)-50,c,v:80000}}))}
const index:DayBar[]=tickDates.map((d,k)=>{const t=k-EXTRA,v=SOLBIT.index[Math.max(0,Math.min(SOLBIT.index.length-1,t))];return {d,o:v,h:v,l:v,c:v,v:1}});
const S=SOLBIT.scenes;
const ref=(sourceId:string,kind:SourceRef['kind'],title:string,publisher:string,publishedAt:string,eventAt:string|null=null):SourceRef=>
  ({sourceId,kind,title,publisher,url:null,eventAt,publishedAt,fetchedAt:'2026-11-18T00:00:00Z',version:1,license:'public',hash:`fixture:${sourceId}`});

// the editor's evidence bundle ("원문 근거 묶기"): every source a card stands on, with the value it carries
export const SOLBIT_OBSERVATIONS:Observation[]=[
  {ref:ref('q-prev','filing','직전 분기보고서 (예시)','분기보고서',at(10,'16:00')),value:18,unit:'%',basis:'yoy'},
  {ref:ref('letter-3y','letter','3년 전 주주서한 (예시)','주주서한','2022-03-15T09:00:00+09:00'),value:10,unit:'배',basis:'level'},
  {ref:ref('deal','filing','인수 주요사항보고서 (예시)','주요사항보고서',at(40,'10:30')),value:12,unit:'배',basis:'level'},
  {ref:ref('ir','filing','인수 투자설명회 자료 (예시)','투자설명회 자료',at(40,'14:00')),value:9,unit:'배',basis:'level',estimate:true},
  {ref:ref('px-s1','price','발표 당일 시세 (예시)','거래소 시세',at(40,'15:30')),unit:'%',calc:{series:'company',from:dayOf(39),to:dayOf(40)}},
  {ref:ref('idx-s1','price','발표 당일 지수 (예시)','거래소 시세',at(40,'15:30')),unit:'%',calc:{series:'index',from:dayOf(39),to:dayOf(40)}},
  {ref:ref('board','filing','이사회 의사록 (예시)','이사회 의사록',at(55,'09:00')),value:1,unit:'명',basis:'count'},
  {ref:ref('review','filing','독립위원회 검토서 (예시)','독립위원회 검토서',at(55,'09:00')),value:2,unit:'곳',basis:'count'},
  {ref:ref('review-appx','filing','독립위원회 검토서 부록 (예시)','독립위원회 검토서 부록',at(55,'09:00')),estimate:true},
  // the trade press piece, that morning (it once said "17거래일 뒤" on a scene at 15: the future check caught it)
  {ref:{...ref('trade-news','news','업계지 보도 (예시)','업계 전문지',at(55,'08:00')),license:'metadata-only'}},
  {ref:ref('q-int-base','filing','첫 통합 분기보고서 (예시)','분기보고서',at(80,'07:30')),value:12,unit:'%',basis:'yoy'},
  {ref:ref('q-int-cut','filing','첫 통합 분기보고서 (예시)','분기보고서 사업부 주석',at(80,'07:30')),value:60,unit:'%',basis:'level'},
  {ref:ref('call','filing','실적 설명회 자료 (예시)','실적 설명회 자료',at(80,'10:00'))},
  {ref:ref('px-s3-day','price','실적 발표 당일 시세 (예시)','거래소 시세',at(80,'15:30')),unit:'%',calc:{series:'company',from:dayOf(79),to:dayOf(80)}},
  {ref:ref('idx-s3-day','price','실적 발표 당일 지수 (예시)','거래소 시세',at(80,'15:30')),unit:'%',calc:{series:'index',from:dayOf(79),to:dayOf(80)}},
  {ref:ref('px-s3-since','price','인수 발표 뒤 시세 (예시)','거래소 시세',at(80,'15:30')),unit:'%',calc:{series:'company',from:dayOf(40),to:dayOf(80)}},
  {ref:ref('idx-s3-since','price','인수 발표 뒤 지수 (예시)','거래소 시세',at(80,'15:30')),unit:'%',calc:{series:'index',from:dayOf(40),to:dayOf(80)}},
];
// which sources each card stands on, and every number it states
const BIND:Record<string,{sourceIds:string[];claims:[string,string,number,string][]}>={
  c1:{sourceIds:['q-prev'],claims:[['+18%','q-prev',18,'%']]},c2:{sourceIds:['letter-3y'],claims:[['10배','letter-3y',10,'배']]},
  c3:{sourceIds:['deal','letter-3y'],claims:[['12배','deal',12,'배'],['10배','letter-3y',10,'배']]},c4:{sourceIds:['ir'],claims:[['9배','ir',9,'배']]},
  c5:{sourceIds:['px-s1','idx-s1'],claims:[['−7%','px-s1',-7,'%'],['−0.3%','idx-s1',-.3,'%']]},
  d1:{sourceIds:['board'],claims:[['1명','board',1,'명']]},d2:{sourceIds:['review'],claims:[['2곳','review',2,'곳']]},d3:{sourceIds:['review-appx'],claims:[]},
  d4:{sourceIds:['trade-news'],claims:[]},e1:{sourceIds:['q-int-base'],claims:[['+12%','q-int-base',12,'%']]},
  e2:{sourceIds:['q-int-cut'],claims:[['60%','q-int-cut',60,'%']]},e3:{sourceIds:['call'],claims:[]},
  e4:{sourceIds:['px-s3-day','idx-s3-day','px-s3-since','idx-s3-since'],claims:[['−4%','px-s3-day',-4,'%'],['+0.4%','idx-s3-day',.4,'%'],['+1%','px-s3-since',1,'%'],['+1.5%','idx-s3-since',1.5,'%']]},
};
export const SOLBIT_DRAFT:EditorDraft={packId:SOLBIT.id,version:SOLBIT.version,sample:true,mentorId:'example-hangyeol',principleId:'capital-allocation-promise',
  instrument:{securityId:'sec-sample-solbit',instrumentId:'SAMPLE-SLBT',exchange:'XKRX',currency:'KRW',alias:SOLBIT.company.alias,realNames:['Solbit Industries','SLBT'],
    business:SOLBIT.company.business,cusip:'SAMPLE001',cusipValid:{from:'2020-01-01',to:'2099-12-31'}},
  index:{instrumentId:'SAMPLE-IDX',exchange:'XKRX'},sessionClose:'15:30:00+09:00',portfolio:{qty:SOLBIT.company.qty,cash:SOLBIT.cash},preDays:S[0].tick,
  scenes:S.map(s=>({id:s.id,no:s.no,title:s.title,date:dayOf(s.tick),situation:s.situation,ask:s.ask,check:s.check,hints:s.hints,focus:s.focus,...(s.observe?{observe:s.observe}:{}),
    cards:s.cards.map(c=>({...c,sourceIds:BIND[c.id].sourceIds,claims:BIND[c.id].claims.map(([text,sourceId,value,unit])=>({text,sourceId,value,unit}))}))})),
  evalDate:dayOf(SOLBIT.evalTick),
  holdings:{managerCik:'0000000001',managerName:SOLBIT.reveal.manager,quarters:['2025Q1','2025Q2'],note:SOLBIT.reveal.holdingsNote},
  reveal:{company:SOLBIT.reveal.company,period:SOLBIT.reveal.period,event:SOLBIT.reveal.event,summary:SOLBIT.reveal.summary,sources:SOLBIT.reveal.sources.map(x=>x.card)}};

const M=SOLBIT.mentor;
export const SOLBIT_MENTOR:Mentor={mentorId:'example-hangyeol',name:'Hangyeol (example)',nameKo:M.name,real:false,bioKo:'관측소 예시를 위해 만든 가상의 거장이에요.',portrait:null};
export const SOLBIT_PRINCIPLE:Principle={principleId:'capital-allocation-promise',mentorId:'example-hangyeol',statementKo:M.principle,problemKo:M.problem,whyKo:M.why,appliesKo:M.applies,breaksKo:M.breaks,contextKo:M.context,
  source:{title:'예시 주주서한',locator:'자본배분 단락',publishedAt:'2022-03-15',url:null,quote:null},premises:['경영진이 숫자로 된 기준을 미리 밝혔다'],
  counterexamples:['사업 환경이 바뀌어 기준을 공개적으로 고친 경우'],misuses:['기준을 밝힌 적 없는 회사에 약속 위반이라고 단정하기'],terms:M.terms,keys:M.principleKeys,demo:M.demo};
const holding=(quarter:string,filedAt:string,rows:[string,number,'SH'|'PRN',('PUT'|'CALL'|null)?][],amendment=false):Holding13F[]=>rows.map(([cusip,shares,shareType,putCall])=>
  ({managerCik:'0000000001',quarter,accession:`0000000001-25-${quarter}`,filedAt,amendment,amendmentType:amendment?'RESTATEMENT':null,issuer:cusip==='SAMPLE001'?'SOLBIT IND (EXAMPLE)':'OTHER CO (EXAMPLE)',
    securityClass:'COM',cusip,shares,shareType,valueUsd:shares*35,putCall:putCall??null}));
export const SOLBIT_13F:Record<string,Holding13F[]>={
  // the same issuer in two rows (two sub-advisers) and an option row that must not count; an unrelated issuer too
  '2025Q1':holding('2025Q1','2025-05-14',[['SAMPLE001',100000,'SH'],['SAMPLE001',20000,'SH'],['SAMPLE001',5000,'SH','CALL'],['OTHER0001',70000,'SH']]),
  '2025Q2':holding('2025Q2','2025-08-13',[['SAMPLE001',90000,'SH'],['OTHER0001',65000,'SH']]),
};
const NEWS:NewsItem[]=[
  {id:'n1',title:'[업계] 경쟁사도 같은 공급사와 가격 협상 중 (예시)',publisher:'업계 전문지',publishedAt:at(55,'08:00'),updatedAt:null,url:'https://example.invalid/n1',usage:'metadata-only',entities:['SAMPLE-SLBT'],dupOf:null},
  {id:'n2',title:'경쟁사도 같은 공급사와 가격 협상 중 (예시)',publisher:'전재 매체',publishedAt:at(55,'11:00'),updatedAt:null,url:'https://example.invalid/n2',usage:'metadata-only',entities:['SAMPLE-SLBT'],dupOf:null}];

// the fixture model: deterministic, schema-shaped answers (the judge reuses the trial word rules), so the pipeline and
// the server can run end to end without a key
export const fixtureLLM:LLMProvider={id:'fixture-llm',async run(task,_v,payload){const p=payload as Record<string,unknown>;
  const reply=(json:unknown)=>({json:json as never,model:'fixture',usage:{input:0,output:0},ms:0});
  if(task==='hint'){const field=String(p.activeField);return reply({question:field==='counter'?'이 가설이 틀렸다면 어떤 자료가 그걸 보여 줄까?':'이 자료에서 확정된 사실과 회사의 추정은 각각 무엇일까?'})}
  if(task==='toulmin'){const i=p as unknown as {scene:{id:string};activeAxes:string[];userSpans:Record<string,string>;visibleCardIds:string[];previousHypothesis:string|null};
    const scene=SOLBIT.scenes.find(s=>s.id===i.scene.id)!,visible=SOLBIT.scenes.filter(s=>s.no<=scene.no).flatMap(s=>s.cards);
    // the fields the axes imply (no course here: the fixture is part of the editor screen, which ships in the app)
    const q:QuestDef={id:'fixture',name:'',teaches:'',level:2,fields:['hypo',...(i.activeAxes.includes('evidence')?['reason' as FieldKey]:[]),...(i.activeAxes.includes('logic')?['counter' as FieldKey]:[])]};
    const fields={...blankFields(),hypo:i.userSpans.hypo??'',reason:i.userSpans.reason??'',ev:i.userSpans.evidenceCard??null,counter:i.userSpans.counter??'',recheck:i.userSpans.recheck??''};
    const dims=TRIAL_JUDGE.grade({quest:q,scene,visible,principleKeys:SOLBIT.mentor.principleKeys,fields,prev:i.previousHypothesis!==null?{...blankFields(),hypo:i.previousHypothesis}:null});
    return reply({dimensions:dims.filter(d=>i.activeAxes.includes(d.key)).map(d=>({key:d.key,grade:d.grade,quote:d.quote.replace(/…$/,''),evidenceIds:d.cards,reason:d.reason})),insufficientEvidence:false})}
  if(task==='explain')return reply({text:String((p.facts as string)??'')});
  if(task==='extract')return reply({claim:String(p.hypothesis??''),target:'',horizon:'',direction:'없음',evidenceRefs:[]});
  return reply({cardTextKo:'',compareKo:'',sourceIds:[],numericClaims:[],termGlossary:[]})}};

export function fixtureProviders():Providers{
  const bars=(id:string)=>id==='SAMPLE-IDX'?index:EXTRA_SERIES.get(id)??company;
  return {
    filings:{id:'fixture-filings',async filings({asOf}){return [{accession:'example-1',form:'10-Q',filedAt:dayOf(10),acceptedAt:null,periodEnd:'2024-12-31',issuerCik:'0000000002',url:'https://example.invalid/f1',amendment:false}].filter(f=>f.filedAt<=asOf)},
      async facts({asOf}){return [{concept:'us-gaap:OperatingIncomeLoss',label:'Operating income (example)',unit:'KRW',value:11_800_000_000,start:'2024-10-01',end:'2024-12-31',fy:2024,fp:'Q4',form:'10-Q',accession:'example-1',filedAt:dayOf(10),kind:'actual' as const}].filter(f=>f.filedAt<=asOf)}},
    holdings:{id:'fixture-13f',async holdings({quarter}){return SOLBIT_13F[quarter]??[]}},
    prices:{id:'fixture-prices',async series({instrumentId,exchange,from,to}){return {instrumentId,exchange,currency:'KRW',session:'regular',adjusted:false,bars:bars(instrumentId).filter(b=>b.d>=from&&b.d<=to)}}},
    actions:{id:'fixture-actions',async actions(){return []}},
    news:{id:'fixture-news',async search({since,until}){return {items:NEWS.filter(n=>n.publishedAt.slice(0,10)>=since&&n.publishedAt.slice(0,10)<=until),cursor:null}}},
    macro:{id:'fixture-macro',async series({series,asOf}){return [{series,period:'2025-03',value:2.1,unit:'%',vintage:'2025-04-10',releasedAt:'2025-04-10'}].filter(m=>m.releasedAt<=asOf)}},
    policy:{id:'fixture-policy',async events(){return []}},
    philosophy:{id:'fixture-philosophy',async mentor(id){return id===SOLBIT_MENTOR.mentorId?SOLBIT_MENTOR:null},async principles(id){return id===SOLBIT_MENTOR.mentorId?[SOLBIT_PRINCIPLE]:[]}},
    llm:fixtureLLM,
  };
}
// the live set, chosen per source by what the content server has configured (fixtures fill in for anything missing)
export const usesLive=(ctx:Ctx,key:string)=>!!ctx.env(key);
