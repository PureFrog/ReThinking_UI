// The editing pipeline (design 7 "편집·발행 파이프라인"): 수집 → 종목·시간대 정규화 → 원문 근거 묶기 → 명제·사건 연결 →
// 한국어 팩 초안 → 검사 → 승인 → KST 날짜 배정. The editor writes a draft (scenes, cards, which sources each card
// stands on, every number it states); gather() fetches through the ports; buildPack() turns both into a DailyPack and
// a report. A pack with any error in its report cannot be published (db/functions/quest-content).
import type {DailyPack,Card,Scene} from '../game/daily/model';
import type {CorporateAction,Holding13F,LLMProvider,Mentor,PriceSeries,Principle,Providers,SourceRef} from './ports';
import {checkEditorCard,EDITOR_SCHEMA,EDITOR_SYSTEM,type EditorInput} from './llm-tasks';

export type Claim={text:string;sourceId:string;value:number;unit:string};
// source: the label the player sees during play (a document type, never a title or a link: those wait for the result)
// llm: the editor bound the sources and asks the editing model for the first draft of the text (checked, then reviewed)
export type DraftCard=Card&{sourceIds:string[];claims:Claim[];llm?:boolean;
  // the model's first draft as it came, kept so the editor screen can count what a person changed (the revision rate)
  llmText?:string};
export type DraftScene=Omit<Scene,'tick'|'cards'>&{date:string;cards:DraftCard[]};
export type EditorDraft={packId:string;version:number;sample:boolean;mentorId:string;principleId:string;
  instrument:{securityId:string;instrumentId:string;exchange:string;currency:string;alias:string;realNames:string[];business:string;
    cusip:string|null;cusipValid:{from:string;to:string}|null};
  index:{instrumentId:string;exchange:string};
  // levels 4·5: companies held alongside, read as comparison (a scene names its target; A otherwise)
  others?:{slot:'B'|'C';instrumentId:string;exchange:string;alias:string;realNames:string[];business:string;qty:number}[];
  // the exchange's close in its own zone: a scene knows what was published by then (after-close news waits a day)
  sessionClose:string;portfolio:{qty:number;cash:number};preDays:number;scenes:DraftScene[];evalDate:string;
  // the flow's headlines (feedback F4), each bound to a source published by that day's close; fee: the pack's own rule
  // summary: the feed's excerpt under the headline (NewsItem.summary), masked as the headline is
  news?:{date:string;title:string;summary?:string;source:string;sourceId:string;about?:'A'|'B'|'C'}[];fee?:number;
  holdings:{managerCik:string;managerName:string;quarters:string[];note:string}|null;
  reveal:{company:string;period:string;event:string;summary:string;sources:string[]}};
// a source bound to the case by the editor ("원문 근거 묶기"): the value it carries, and how a price claim is recomputed
// text: the excerpt the editing model may read (an allowed fragment, never a whole article without a licence)
export type Observation={ref:SourceRef;text?:string;value?:number;unit?:string;basis?:'yoy'|'qoq'|'level'|'count';estimate?:boolean;
  calc?:{series:'company'|'index';from:string;to:string}};
export type Gathered={company:PriceSeries;index:PriceSeries;others?:Record<string,PriceSeries>;otherActions?:Record<string,CorporateAction[]>;actions:CorporateAction[];observations:Observation[];holdings:Record<string,Holding13F[]>;mentor:Mentor|null;principle:Principle|null};
export type Issue={level:'error'|'warning';code:string;where:string;message:string};

export async function gather(p:Providers,d:EditorDraft,observations:Observation[]):Promise<Gathered>{
  const first=d.scenes[0].date,from=shiftDays(first,-Math.ceil(d.preDays*1.6)-10),to=shiftDays(d.evalDate,7);
  const [company,index,actions,mentor]=await Promise.all([
    p.prices.series({instrumentId:d.instrument.instrumentId,exchange:d.instrument.exchange,from,to}),
    p.prices.series({instrumentId:d.index.instrumentId,exchange:d.index.exchange,from,to}),
    p.actions.actions({instrumentId:d.instrument.instrumentId,from,to}),p.philosophy.mentor(d.mentorId)]);
  const principle=(await p.philosophy.principles(d.mentorId)).find(x=>x.principleId===d.principleId)??null;
  const others:Record<string,PriceSeries>={},otherActions:Record<string,CorporateAction[]>={};
  for(const o of d.others??[]){others[o.slot]=await p.prices.series({instrumentId:o.instrumentId,exchange:o.exchange,from,to});otherActions[o.slot]=await p.actions.actions({instrumentId:o.instrumentId,from,to})}
  const holdings:Record<string,Holding13F[]>={};
  if(d.holdings)for(const q of d.holdings.quarters)holdings[q]=await p.holdings.holdings({managerCik:d.holdings.managerCik,quarter:q});
  return {company,index,others,otherActions,actions,observations,holdings,mentor,principle};
}
const shiftDays=(day:string,n:number)=>new Date(Date.parse(day+'T00:00:00Z')+n*864e5).toISOString().slice(0,10);
const CUR:Record<string,string>={KRW:'원',USD:'달러',JPY:'엔',EUR:'유로'};
const CAL:Record<string,string>={XKRX:'한국',XKOS:'한국',XNYS:'미국',XNAS:'미국',XTKS:'일본',XLON:'영국'};
const quarterEnd=(q:string)=>`${q.slice(0,4)}-${['03-31','06-30','09-30','12-31'][Number(q.slice(5))-1]}`;
const DIRECTION=/(매수|매도|사세요|파세요|사라|팔아|오를\s*것|내릴\s*것|오를\s*거|떨어질\s*것)/;
// a feed excerpt under a headline: two short sentences at most (core/content/live/rss.ts cuts feeds to 160)
export const NEWS_SUMMARY_MAX=160;
const ESTIMATE=/(추정|전망|계획|목표|예상|미체결)/;
const pctOf=(a:number,b:number)=>(b/a-1)*100;
const numbersIn=(s:string)=>[...s.replace(/−/g,'-').matchAll(/\d+(?:[.,]\d+)?/g)].map(m=>Number(m[0].replace(/,/g,'')));

export function buildPack(d:EditorDraft,g:Gathered):{pack:DailyPack|null;issues:Issue[]}{
  const issues:Issue[]=[],err=(code:string,where:string,message:string)=>issues.push({level:'error',code,where,message}),warn=(code:string,where:string,message:string)=>issues.push({level:'warning',code,where,message});
  // ── prices: raw only, one calendar, the actions ledger applied once ──
  if(g.company.adjusted||g.index.adjusted)err('adjusted','prices','수정주가가 들어왔어요. 원시 가격과 기업행사 원장을 따로 받아야 이중 반영을 막을 수 있어요.');
  const bars=g.company.bars,days=bars.map(b=>b.d),t1=days.indexOf(d.scenes[0].date),start=t1-d.preDays,end=days.indexOf(d.evalDate);
  if(t1<0||end<0||start<0){err('calendar','prices','장면 날짜나 평가일이 거래일 목록에 없거나, 앞쪽 기록이 모자라요.');return {pack:null,issues}}
  const span=bars.slice(start,end+1),idxBy=new Map(g.index.bars.map(b=>[b.d,b.c]));
  const missing=span.filter(b=>!idxBy.has(b.d));if(missing.length)err('index-calendar','prices',`지수에 없는 거래일 ${missing.length}일: ${missing.slice(0,3).map(b=>b.d).join(', ')}`);
  const tickOf=(day:string)=>days.indexOf(day)-start;
  const qty=d.portfolio.qty,scale=span.map(()=>1),dividends:{tick:number;perShare:number}[]=[],splits:{tick:number;ratio:number}[]=[],t0=tickOf(d.scenes[0].date);
  for(const a of g.actions){const t=tickOf(a.exDate);if(t<1||t>end-start)continue;
    // before the first scene: the history is put on the post-split basis (the start is clean); during play: raw
    // prices stay and the split goes in the ledger, so held shares multiply on its day (applied once either way)
    if(a.kind==='split'&&a.ratio){if(t<=t0){for(let k=0;k<t;k++)scale[k]/=a.ratio}else splits.push({tick:t,ratio:a.ratio});warn('split',a.exDate,`분할 ${a.ratio}:1을 한 번 반영했어요.`)}
    if(a.kind==='dividend'&&a.amount){if(a.currency&&a.currency!==g.company.currency)err('dividend-currency',a.exDate,'배당 통화가 시세 통화와 달라요.');dividends.push({tick:t,perShare:a.amount})}}
  const prices=span.map((b,k)=>[Math.round(b.o*scale[k]*100)/100,Math.round(b.c*scale[k]*100)/100] as [number,number]);
  // the other companies on the same days, raw, each with its own ledger applied once (as for A above)
  const others=(d.others??[]).map(o=>{const s=g.others?.[o.slot];const by=new Map((s?.bars??[]).map(b=>[b.d,b]));
    if(!s||s.adjusted)err('other-prices',o.slot,`${o.alias}의 원시 시세가 없어요.`);
    const miss=span.filter(b=>!by.has(b.d));if(miss.length)err('other-calendar',o.slot,`${o.alias} 시세에 없는 거래일 ${miss.length}일`);
    const sc=span.map(()=>1),osplits:{tick:number;ratio:number}[]=[],odiv:{tick:number;perShare:number}[]=[];
    for(const a of g.otherActions?.[o.slot]??[]){const t=tickOf(a.exDate);if(t<1||t>end-start)continue;
      if(a.kind==='split'&&a.ratio){if(t<=t0){for(let k=0;k<t;k++)sc[k]/=a.ratio}else osplits.push({tick:t,ratio:a.ratio});warn('split',a.exDate,`${o.alias} 분할 ${a.ratio}:1을 한 번 반영했어요.`)}
      if(a.kind==='dividend'&&a.amount){if(a.currency&&s&&a.currency!==s.currency)err('dividend-currency',a.exDate,`${o.alias} 배당 통화가 시세 통화와 달라요.`);odiv.push({tick:t,perShare:a.amount})}}
    return {slot:o.slot,alias:o.alias,business:o.business,qty:o.qty,prices:span.map((b,k)=>{const x=by.get(b.d);return [x?Math.round(x.o*sc[k]*100)/100:NaN,x?Math.round(x.c*sc[k]*100)/100:NaN] as [number,number]}),
      ...(osplits.length?{splits:osplits}:{}),...(odiv.length?{dividends:odiv}:{})}});
  const slots=['A',...others.map(o=>o.slot)];
  // ── scenes: knowable by the session close, each after the last fill ──
  const scenes:Scene[]=[];let lastFill=-1;
  d.scenes.forEach((s,i)=>{const tick=tickOf(s.date),where=`장면 ${s.no}`,asOf=Date.parse(`${s.date}T${d.sessionClose}`);
    if(tick<0){err('scene-date',where,`${s.date}가 거래일이 아니에요.`);return}
    if(tick<=lastFill)err('scene-order',where,'앞 장면의 체결일보다 뒤여야 해요.');lastFill=tick+1;
    for(const t of [tick,tick+1])if(span[t]&&span[t].v===0)err('halt',where,`${days[start+t]} 거래가 없어요(거래정지). 실제 체결 가격이 없으면 편집 단계에서 빼요.`);
    if(s.cards.length<3||s.cards.length>5)err('card-count',where,`핵심 카드는 3~5장이어야 해요(지금 ${s.cards.length}장).`);
    const rels=new Set(s.cards.map(c=>c.rel).filter(r=>r!=='context'));if(rels.size<2)err('one-reading',where,'합리적으로 다른 해석 두 가지를 세울 자료가 없어요(지지·약화·대안 중 둘 이상).');
    for(const f of s.focus)if(!s.cards.some(c=>c.id===f))err('focus',where,`먼저 볼 자료 ${f}가 카드에 없어요.`);
    const ob=s.observe;
    const inPlay=[s.title,s.situation,s.ask,s.check??'',s.hints.tori,s.hints.moa,s.hints.luon,...s.cards.flatMap(c=>[c.fact,c.compare??'',c.when,c.term?.meaning??'']),
      ...(ob?[ob.base,...ob.targets.map(t=>t.label),...ob.periods.map(p=>p.label)]:[])].join('\n');
    // what a hypothesis can be checked against (feedback F2): the editor sets it beforehand; the given parts are on the
    // lists, and every announced value names a listed target and period
    if(ob){if(!ob.targets.length||!ob.periods.length||!(ob.flat>=0))err('observe',where,'확인할 대상·시점 목록과 비슷 범위가 있어야 해요.');
      if(!ob.targets.some(t=>t.id===ob.given.target)||!ob.periods.some(p=>p.id===ob.given.period))err('observe',where,'제공하는 대상·시점이 목록에 없어요.');
      for(const t of ob.targets)if(t.about&&!slots.includes(t.about))err('observe',where,`확인 대상 ${t.label}의 종목이 포트폴리오에 없어요.`);
      for(const k of Object.keys(ob.actual??{})){const [t,p]=k.split('@');if(!ob.targets.some(x=>x.id===t)||!ob.periods.some(x=>x.id===p))err('observe',where,`발표값 ${k}가 목록의 대상·시점이 아니에요.`)}}
    for(const name of [...d.instrument.realNames,d.instrument.instrumentId,...(d.others??[]).flatMap(o=>[...o.realNames,o.instrumentId])])if(name&&inPlay.includes(name))err('real-name',where,`진행 중 화면에 실명·티커 "${name}"가 있어요.`);
    if(s.target&&!slots.includes(s.target))err('target',where,`판단할 종목 ${s.target}가 포트폴리오에 없어요.`);
    for(const t of [tick,tick+1])for(const o of others)if(span[t]&&!(o.prices[t]?.[1]>0))err('halt',where,`${o.alias}의 ${days[start+t]} 가격이 없어요.`);
    if(/(19|20)\d{2}\s*년|\b(19|20)\d{2}-\d{2}/.test(inPlay))err('period',where,'진행 중 화면에 연도가 보여요. 시기는 결과에서 공개해요.');
    for(const c of s.cards){const cw=`${where} ${c.id}`,text=`${c.fact} ${c.compare??''}`;
      if(DIRECTION.test(text))err('direction',cw,'카드에 결론이나 매매 방향이 있어요.');
      const obs=c.sourceIds.map(id=>g.observations.find(o=>o.ref.sourceId===id));
      if(!c.sourceIds.length||obs.some(o=>!o))err('source',cw,'출처가 없거나 묶이지 않은 출처가 있어요.');
      for(const o of obs){if(!o)continue;const pub=Date.parse(o.ref.publishedAt);
        if(!(pub<=asOf))err('future',cw,`출처 ${o.ref.sourceId}는 ${o.ref.publishedAt}에 공개돼서 이 장면(${s.date} 장 마감)에는 쓸 수 없어요.`);
        if(o.estimate&&!ESTIMATE.test(text))err('estimate',cw,'추정·계획인 자료를 확정처럼 썼어요.');
        if(o.ref.license==='unknown')warn('license',cw,`출처 ${o.ref.sourceId}의 이용 범위를 확인하지 않았어요.`)}
      // every number on the card is a claim with its source, and the claim matches the source
      const claimed=c.claims.flatMap(x=>numbersIn(x.text));
      for(const n of numbersIn(text))if(!claimed.includes(n))err('unsourced-number',cw,`숫자 ${n}의 출처가 적혀 있지 않아요.`);
      for(const cl of c.claims){const o=g.observations.find(x=>x.ref.sourceId===cl.sourceId);
        if(!text.includes(cl.text)){err('claim-text',cw,`"${cl.text}"가 카드 문장에 없어요.`);continue}
        if(!o||!c.sourceIds.includes(cl.sourceId)){err('claim-source',cw,`"${cl.text}"의 출처가 카드 출처에 없어요.`);continue}
        let v=o.value;
        if(o.calc){const ser=o.calc.series==='company'?(day:string)=>bars.find(b=>b.d===day)?.c:(day:string)=>idxBy.get(day);const a=ser(o.calc.from),b=ser(o.calc.to);
          // a company move across a split is measured per original share (raw prices × the splits in between)
          const k=o.calc.series==='company'?g.actions.filter(x=>x.kind==='split'&&x.ratio&&x.exDate>o.calc!.from&&x.exDate<=o.calc!.to).reduce((f,x)=>f*x.ratio!,1):1;
          v=a&&b?pctOf(a,b*k):undefined}
        if(v===undefined){err('claim-value',cw,`"${cl.text}"의 출처 값이 없어요.`);continue}
        if(o.unit&&o.unit!==cl.unit)err('unit',cw,`"${cl.text}" 단위가 출처(${o.unit})와 달라요.`);
        if(Math.abs(v-cl.value)>(cl.unit==='%'?.5:1e-9))err('number',cw,`"${cl.text}"가 출처 값 ${Math.round(v*100)/100}와 맞지 않아요.`);
        const signed=/^[+−-]/.test(cl.text.trim());if(signed&&(cl.text.trim().startsWith('+')?v<0:v>0))err('sign',cw,`"${cl.text}"의 부호가 출처와 반대예요.`);
        if(o.basis==='yoy'&&!/전년/.test(text))err('basis',cw,`"${cl.text}"는 전년 대비인데 비교 기준이 적혀 있지 않아요.`);
        if(o.basis==='qoq'&&!/전분기/.test(text))err('basis',cw,`"${cl.text}"는 전분기 대비인데 비교 기준이 적혀 있지 않아요.`)}}
    scenes.push({id:s.id,no:s.no,title:s.title,tick,situation:s.situation,ask:s.ask,check:s.check,hints:s.hints,focus:s.focus,...(s.target?{target:s.target}:{}),...(s.observe?{observe:s.observe}:{}),
      cards:s.cards.map(c=>({id:c.id,kind:c.kind,when:c.when,fact:c.fact,...(c.compare!==undefined?{compare:c.compare}:{}),...(c.term?{term:c.term}:{}),
        source:c.source,rel:c.rel,keys:c.keys}))});
    void i});
  const evalTick=end-start;if(scenes.length&&evalTick<=scenes[scenes.length-1].tick+1)err('eval','평가일','마지막 체결 뒤에 평가일이 있어야 해요.');
  // ── the master: a source for the principle, a portrait only with checked rights ──
  const m=g.mentor,pr=g.principle;
  if(!m||!pr){err('mentor','거장','거장이나 명제를 찾지 못했어요.');return {pack:null,issues}}
  if(m.real&&(!pr.source.title||!pr.source.locator||!pr.source.publishedAt))err('principle-source','거장','실제 거장의 명제에는 원문 제목·위치·발표일이 있어야 해요.');
  if(m.portrait&&!m.portrait.rightsChecked)warn('portrait','거장','초상 사용권을 확인하지 않아 이름 모노그램으로 보여요.');
  // ── holdings: CUSIP only, shares only, inside the identifier's valid dates; otherwise the comparison waits ──
  let holdings:{quarter:string;shares:number}[]=[],holdingsNote=d.holdings?.note??'';
  if(d.holdings){const cusip=d.instrument.cusip,ok=d.holdings.quarters.every(q=>{const e=quarterEnd(q);return !!cusip&&(!d.instrument.cusipValid||(e>=d.instrument.cusipValid.from&&e<=d.instrument.cusipValid.to))});
    const rows=d.holdings.quarters.map(q=>({quarter:q,rows:(g.holdings[q]??[]).filter(r=>r.cusip===cusip&&r.shareType==='SH'&&!r.putCall)}));
    if(!ok||rows.some(r=>!r.rows.length)){warn('holdings','보유 변화','종목 식별자로 맞는 13F 행이 없어서 보유 변화 비교를 보류해요.');holdingsNote='종목 식별자를 확정하지 못해 이 비교는 보류했어요.'}
    else holdings=rows.map(r=>({quarter:quarterLabel(r.quarter),shares:r.rows.reduce((s,x)=>s+x.shares,0)}))}
  // ── the flow's headlines: on a trading day of the span, known by its close, no name, year or direction ──
  const realNames=[...d.instrument.realNames,d.instrument.instrumentId,...(d.others??[]).flatMap(o=>[...o.realNames,o.instrumentId])];
  const news=(d.news??[]).map(n=>{const t=tickOf(n.date),where=`뉴스 ${n.date}`;
    if(t<1||t>end-start||days.indexOf(n.date)<0)err('news-date',where,'뉴스 날짜가 기록 구간의 거래일이 아니에요.');
    // the excerpt under the headline is held to the same rules (no name, year or direction) and kept short
    for(const [part,text] of [['제목',n.title],['요약',n.summary??'']] as const){
      for(const name of realNames)if(name&&text.includes(name))err('real-name',where,`뉴스 ${part}에 실명·티커 "${name}"가 있어요.`);
      if(/(19|20)\d{2}\s*년/.test(text))err('period',where,`뉴스 ${part}에 연도가 보여요.`);
      if(DIRECTION.test(text))err('direction',where,`뉴스 ${part}에 매매 방향이 있어요.`)}
    if(n.summary&&n.summary.length>NEWS_SUMMARY_MAX)err('news-summary',where,`뉴스 요약은 ${NEWS_SUMMARY_MAX}자 이내로 줄여요.`);
    if(n.about&&!slots.includes(n.about))err('news-about',where,'뉴스의 종목이 포트폴리오에 없어요.');
    const o=g.observations.find(x=>x.ref.sourceId===n.sourceId);
    if(!o)err('source',where,'뉴스 출처가 묶여 있지 않아요.');else if(!(Date.parse(o.ref.publishedAt)<=Date.parse(`${n.date}T${d.sessionClose}`)))err('future',where,`출처 ${o.ref.sourceId}는 그날 장 마감 뒤에 공개돼요.`);
    return {tick:t,title:n.title,...(n.summary?{summary:n.summary}:{}),source:n.source,...(n.about?{about:n.about}:{})}}).sort((a,b)=>a.tick-b.tick);
  // the result's first page reads the event at a glance (feedback F3): two sentences at most, the rest behind 원문 보기
  if(d.reveal.event.split(/(?<=[.!?。])(?!\d)\s+/).filter(x=>x.trim()).length>2)err('reveal-length','사례 공개','사건 설명은 두 문장 이내로 줄여요. 자세한 내용은 요약과 원문에 둬요.');
  const refOf=(card:string)=>{const c=d.scenes.flatMap(s=>s.cards).find(x=>x.id===card);return c?g.observations.find(o=>o.ref.sourceId===c.sourceIds[0])?.ref:undefined};
  const pack:DailyPack={id:d.packId,version:d.version,sample:d.sample,
    mentor:{name:m.nameKo,monogram:m.nameKo.slice(0,1),label:m.real?`${pr.source.title} · ${pr.source.locator}`:'예시 거장 · 실제 인물이 아니에요 · 출처 검수 전',
      problem:pr.problemKo,principle:pr.statementKo,why:pr.whyKo,applies:pr.appliesKo,breaks:pr.breaksKo,context:pr.contextKo,terms:pr.terms,demo:pr.demo,principleKeys:pr.keys,
      ...(m.portrait?.rightsChecked?{portrait:{uri:m.portrait.uri,alt:m.portrait.alt,credit:`${m.portrait.author} · ${m.portrait.license}`}}:{})},
    company:{alias:d.instrument.alias,business:d.instrument.business,qty},cash:d.portfolio.cash,currency:CUR[g.company.currency]??g.company.currency,
    market:{calendar:d.instrument.exchange,label:`${CAL[d.instrument.exchange]??d.instrument.exchange} 거래일 · ${CUR[g.company.currency]??g.company.currency}`,fee:d.fee??.001},...(news.length?{news}:{}),
    prices,index:span.map(b=>idxBy.get(b.d)??NaN),scenes,evalTick,...(others.length?{others}:{}),...(dividends.length?{dividends}:{}),...(splits.length?{splits}:{}),
    reveal:{company:d.reveal.company,period:d.reveal.period,event:d.reveal.event,summary:d.reveal.summary,manager:d.holdings?.managerName??'',holdings,holdingsNote,
      sources:d.reveal.sources.map(card=>({card,title:refOf(card)?.title??card}))}};
  return {pack,issues};
}
const quarterLabel=(q:string)=>`${['1','2','3','4'][Number(q.slice(5))-1]}분기 말`;
export const publishable=(issues:Issue[])=>!issues.some(i=>i.level==='error');

// the editing model's first drafts (design 7 편집 LLM): for each card marked llm, the allowed fragments of its own sources
// go in with the alias dictionary and the scene's asOf; a reply that fails checkEditorCard is dropped and the card
// stays for the editor to write. A drafted card always carries a review warning: nothing it wrote is shown unreviewed.
export async function draftCards(llm:LLMProvider,d:EditorDraft,observations:Observation[],principle:string):Promise<{draft:EditorDraft;issues:Issue[]}>{
  const issues:Issue[]=[],aliases=Object.fromEntries(d.instrument.realNames.map(n=>[n,d.instrument.alias]));
  const scenes=[];
  for(const s of d.scenes){const cards=[];
    for(const c of s.cards){if(!c.llm){cards.push(c);continue}
      const frags=c.sourceIds.map(id=>observations.find(o=>o.ref.sourceId===id)).filter((o):o is Observation=>!!o&&!!o.text).map(o=>({sourceId:o.ref.sourceId,text:o.text!,publishedAt:o.ref.publishedAt}));
      const input:EditorInput={sceneAsOf:`${s.date}T${d.sessionClose}`,principle,aliases,fragments:frags};
      const where=`장면 ${s.no} ${c.id}`;
      if(!frags.length){issues.push({level:'error',code:'llm-no-fragment',where,message:'편집 LLM에 줄 출처 조각이 없어요.'});cards.push(c);continue}
      try{const r=await llm.run('editor-cards','editor-v1',input,EDITOR_SCHEMA,EDITOR_SYSTEM);const v=checkEditorCard(r.json,input);
        if(!v.ok){issues.push({level:'error',code:'llm-refused',where,message:`편집 LLM 초안을 쓰지 않았어요(${v.why}). 직접 써 주세요.`});cards.push(c);continue}
        cards.push({...c,llm:false,llmText:v.card.cardTextKo,fact:v.card.cardTextKo,compare:v.card.compareKo||undefined,sourceIds:v.card.sourceIds,claims:v.card.numericClaims,
          ...(v.card.termGlossary[0]?{term:v.card.termGlossary[0]}:{})});
        issues.push({level:'warning',code:'llm-draft',where,message:`편집 LLM(${r.model})이 쓴 초안이에요. 승인 전에 사람이 원문과 대조해 주세요.`})}
      catch(e){issues.push({level:'error',code:'llm-failed',where,message:`편집 LLM 호출 실패: ${(e as Error).message}`});cards.push(c)}}
    scenes.push({...s,cards})}
  return {draft:{...d,scenes},issues};
}

// the editor screen's file (tools/content/build-pack.mjs writes it): the draft, the evidence bundle and what the sources
// returned, so checks re-run in the browser with no key; and the revision count for the operations view
export type EditBundle={draft:EditorDraft;observations:Observation[];gathered:Gathered};
export const llmRevision=(d:EditorDraft)=>{const cs=d.scenes.flatMap(s=>s.cards).filter(c=>c.llmText!==undefined);return {drafted:cs.length,edited:cs.filter(c=>c.fact!==c.llmText).length}};
