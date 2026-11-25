// 오늘의 관측소 (daily_quest_design v1, 2026-11-18): a past event in three scenes, a lesson from a master first, then
// at each scene the player writes their hypothesis and decides 보유 or a partial sale in one confirm. The game stays in
// the game: nothing here writes to the 지기 journals. Pure: the screen and the save call these; same inputs, same result.
//   request   one a day, handed out by the server (its course lives there only); a run carries the definition it got
//   run       one play of a quest: lesson → portfolio → scenes 1~3 → result, drafts kept so leaving and coming back works
//   fills     a decision sells a fraction of what is left at the next trading day's open (0.1% fee), kept as an exact
//             fraction of shares so three halves leave exactly 1/8
//   progress  investor_progress (profile v5.0 top level): total XP, title and level, the award ledger
export type FieldKey='hypo'|'reason'|'counter'|'recheck'|'shift';
// a structured hypothesis (feedback F2): what is watched, until when, which way — and the player's reason in `hypo`.
// target / period are ids from the scene's observe list; the system fills them on days that do not practise choosing
export type Dir='증가'|'비슷'|'감소';
export const DIRS:Dir[]=['증가','비슷','감소'];
// how the view moved from the scene before (a scene after the first, on a day that practises saying so)
export type Shift='유지'|'수정'|'뒤집기';
export const SHIFTS:Shift[]=['유지','수정','뒤집기'];
export type Fields={hypo:string;reason:string;ev:string|null;counter:string;recheck:string;target:string|null;period:string|null;dir:Dir|null;shift:Shift|null};
export const blankFields=():Fields=>({hypo:'',reason:'',ev:null,counter:'',recheck:'',target:null,period:null,dir:null,shift:null});
export const FIELD_LABEL:Record<FieldKey,string>={hypo:'가설',reason:'근거',counter:'반례',recheck:'재점검 조건',shift:'판단 변화'};

// ── content ────────────────────────────────────────────────────────────────────────────────────────────────────────
export type CardKind='재무'|'공시'|'회사 설명'|'뉴스'|'시장';
// rel: how the card stands to the day's principle — for the editor only, never shown to the player
// about: which company the card is on (A unless said; shown when a pack holds several)
export type Card={id:string;kind:CardKind;when:string;fact:string;compare?:string;term?:{word:string;meaning:string};source:string;about?:Slot;
  rel:'support'|'weaken'|'alt'|'context';keys:string[]};
// what a hypothesis can be checked against (feedback F2): the observable targets, the announcement dates that will show
// them, the comparison base and the band counted as 비슷 (set by the editor beforehand). `actual` is what was announced
// (change against `base`, %) by `${target}@${period}` — future at the scene, so the server's cut drops it until the end
export type Observe={targets:{id:string;label:string;about?:Slot}[];periods:{id:string;label:string}[];base:string;flat:number;
  given:{target:string;period:string};actual?:Record<string,{change:number;source:string}>};
// target: the company this scene's hypothesis and decision are about (A unless a level-5 pack moves it; design 3-3)
export type Scene={id:string;no:1|2|3;title:string;tick:number;situation:string;cards:Card[];focus:[string,string];ask:string;target?:Slot;
  // what the previous expectation can be checked against now ("아직 확인 전" when nothing can be)
  check:string|null;hints:{tori:string;moa:string;luon:string};observe?:Observe};
export type Mentor={name:string;monogram:string;label:string;problem:string;principle:string;why:string;applies:string;breaks:string;
  context:string;terms:{word:string;meaning:string}[];demo:{fact:string;line:string;how:string};principleKeys:string[];
  // only a portrait whose rights were checked (content/pipeline.ts); otherwise the monogram stands in
  portrait?:{uri:string;alt:string;credit:string}};
export type Bar=[o:number,c:number];
// several companies (design 3-3, levels 4·5): A is `company`/`prices`; the others are held from the start and are only
// sold in a scene that names them its target; one not judged still counts toward the result as held
export type Slot='A'|'B'|'C';
export type OtherCompany={slot:Exclude<Slot,'A'>;alias:string;business:string;qty:number;prices:Bar[];
  // its own corporate-actions ledger, like the pack's for A
  splits?:{tick:number;ratio:number}[];dividends?:{tick:number;perShare:number}[]};
// the market the pack plays on (feedback F4): the exchange whose trading days the ticks are, how it reads on screen and
// the fee per fill. A pack's own rules: no Korean price limits or tick sizes on a US case (fills are at the raw open)
export type Market={calendar:string;label:string;fee:number};
// a headline that arrives during the flow on its trading day (names masked as on the cards)
// summary: the feed's excerpt under the headline (core/content/ports.ts NewsItem.summary), masked as the headline is
export type NewsItem={tick:number;title:string;summary?:string;source:string;about?:Slot};
export type DailyPack={id:string;version:number;sample:boolean;mentor:Mentor;market?:Market;news?:NewsItem[];
  company:{alias:string;business:string;qty:number};cash:number;currency:string;
  // one row per trading day from the first one shown; nothing past a scene's tick is ever drawn during play
  prices:Bar[];index:number[];scenes:Scene[];evalTick:number;others?:OtherCompany[];
  // cash dividends from the corporate-actions ledger (applied once, by the pipeline): per share, on the ex-date's tick
  dividends?:{tick:number;perShare:number}[];
  // splits from the same ledger, on raw prices: on the ex-date's tick every share held becomes `ratio` shares
  splits?:{tick:number;ratio:number}[];
  reveal:{company:string;period:string;event:string;summary:string;manager:string;holdings:{quarter:string;shares:number}[];holdingsNote:string;
    sources:{card:string;title:string}[]}};

// ── the request of the day ─────────────────────────────────────────────────────────────────────────────────────
// (feedback 2026-11-19) the course — names, order, what unlocks what, the packs to come — lives on the server only
// (core/game/daily/course.ts, never imported by the app). A run carries the one definition it was given, so the app
// never holds the list or anything still to come.
// tier: 입문 · 기초 · 중급 · 상급 (what the day is part of); aid: how much of the hypothesis the system fills — the target
// and the period are given or chosen, the direction is always chosen; no aid = the hypothesis is written freely (상급).
// The help follows what the day newly teaches (feedback F2: 도움의 양은 그날 새로 배우는 기능에 맞춘다).
// evFrom 'focus': the evidence is picked from the scene's two focus cards, which point different ways (weighing them)
export type Tier='입문'|'기초'|'중급'|'상급';
export type Aid={target:'given'|'choose';period:'given'|'choose'};
export type QuestDef={id:string;name:string;teaches:string;level:number;fields:FieldKey[];tier?:Tier;aid?:Aid;evFrom?:'focus'};
export type Quest=QuestDef;
export type QuestId=string;
// the old level-1 sentence frame (runs saved before the structured hypothesis): the game's words, never scored
export const FRAME='이 사실을 보면 회사에 대한 내 판단은 ';
export const own=(q:Quest,hypo:string)=>(q.level===1&&hypo.startsWith(FRAME)?hypo.slice(FRAME.length):hypo).trim();
// a run saved before runs carried their definition reads as a plain past request
export const defOf=(r:{quest:string;def?:QuestDef}):QuestDef=>r.def??{id:r.quest,name:'지난 의뢰',teaches:'',level:2,fields:['hypo']};
// the structured form applies where the day gives aid and the scene says what can be checked
export const structured=(q:QuestDef,s:Scene|null|undefined):s is Scene&{observe:Observe}=>!!q.aid&&!!s?.observe;
// the target and period in force: given by the system or picked by the player (null when not picked or not offered)
export function partsOf(q:QuestDef,s:Scene,f:Fields){
  if(!structured(q,s))return null;const o=s.observe,a=q.aid!;
  const tid=a.target==='given'?o.given.target:f.target,pid=a.period==='given'?o.given.period:f.period;
  return {o,target:o.targets.find(t=>t.id===tid)??null,period:o.periods.find(p=>p.id===pid)??null,dir:f.dir,why:f.hypo.trim()};
}
// the whole hypothesis as one line (shown back to the player)
export function hypoLine(q:QuestDef,s:Scene|null|undefined,f:Fields):string{
  const p=s?partsOf(q,s,f):null;if(!p)return own(q,f.hypo);
  return `${p.target?.label??'대상 미정'} · ${p.period?.label??'기간 미정'} · ${p.o.base} ${p.dir??'방향 미정'}${p.why?` — 그렇게 본 이유는 ${p.why}`:''}`;
}
// only what the player chose and wrote: what the system filled never counts toward the score (feedback F2)
export function ownText(q:QuestDef,s:Scene|null|undefined,f:Fields):string{
  const p=s?partsOf(q,s,f):null;if(!p)return own(q,f.hypo);const a=q.aid!;
  return [a.target==='choose'?p.target?.label:null,a.period==='choose'?p.period?.label:null,p.dir,p.why].filter(Boolean).join(' · ');
}
export function missingOf(q:Quest,f:Fields,s?:Scene):FieldKey[]{
  const p=s?partsOf(q,s,f):null;
  return q.fields.filter(k=>k==='hypo'?(p?!p.dir||!p.why||!p.target||!p.period:!own(q,f.hypo))
    :k==='reason'?!f.reason.trim()||!f.ev||(q.evFrom==='focus'&&!!s&&!s.focus.includes(f.ev))
    :k==='shift'?!!s&&s.no>1&&!f.shift
    :!f[k].trim());
}

// ── fractions of a share ──────────────────────────────────────────────────────────────────────────────────────────
export type Frac={n:number;d:number};
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):Math.abs(a);
export const frac=(n:number,d=1):Frac=>{const g=gcd(n,d)||1;return {n:n/g,d:d/g}};
export const fmul=(a:Frac,b:Frac)=>frac(a.n*b.n,a.d*b.d);
export const fsub=(a:Frac,b:Frac)=>frac(a.n*b.d-b.n*a.d,a.d*b.d);
export const fval=(a:Frac)=>a.n/a.d;
// the choices offered (feedback F4): 보유 · 1/8 · 1/4 · 1/2 of what is left; 3/4 stays readable for runs saved before
export type Fraction='0'|'1/8'|'1/4'|'1/2'|'3/4';
export const FRACTIONS:{id:Fraction;label:string;part:Frac}[]=[
  {id:'0',label:'보유',part:frac(0)},{id:'1/8',label:'1/8 매도',part:frac(1,8)},{id:'1/4',label:'1/4 매도',part:frac(1,4)},{id:'1/2',label:'1/2 매도',part:frac(1,2)}];
const ALL_FRACTIONS=[...FRACTIONS,{id:'3/4' as Fraction,label:'3/4 매도',part:frac(3,4)}];
export const fractionLabel=(f:Fraction)=>ALL_FRACTIONS.find(x=>x.id===f)?.label??f;
const partOf=(f:Fraction)=>ALL_FRACTIONS.find(x=>x.id===f)!.part;
export const FEE=.001;
export const feeOf=(p:DailyPack)=>p.market?.fee??FEE;

// ── a run ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export type Stage='lesson'|'portfolio'|'scene'|'result';
export type Decision={scene:string;fields:Fields;fraction:Fraction;at:number};
// ranked: the first play of (day, quest); practice: every replay, and a ranked run finished after its day is over
export type DailyRun={id:string;day:string;dailyId:string;quest:QuestId;def?:QuestDef;pack:string;version:number;mode:'ranked'|'practice';
  stage:Stage;scene:number;drafts:Record<string,Fields>;picks:Record<string,Fraction|null>;decisions:Decision[];
  startedAt:number;finishedAt:number|null;result:RunResult|null;
  // signed in: what the server's quest-settle said (its replay replaces the local result; an error keeps it local)
  synced?:{at:number;error?:string};
  // an official pack (quest-play): the pack as cut at the current scene, replaced after each committed decision
  dto?:DailyPack;
  // official runs: the revision of the drafts as last saved on the server (design 8 PUT draft)
  draftRev?:number;
  // the market playing between two moments (feedback F4: the expedition's flow): from one stop to the next, `at` the day
  // shown; `next` is what opens when it stops. The device's own state — the server never reads it
  play?:{from:number;to:number;at:number;next:'scene'|'result'}};
export const packOfRun=(r:DailyRun,local:(id:string)=>DailyPack|null)=>r.dto??local(r.pack);
export const dailyIdOf=(day:string,quest:string,pack:string)=>`${day}:${pack}:${quest}`;
// the service day is Korea's
export const kstDay=(now:number)=>new Date(now+9*3600000).toISOString().slice(0,10);

export const finished=(runs:DailyRun[])=>runs.filter(r=>r.finishedAt!==null);
export const doneOf=(runs:DailyRun[])=>finished(runs).map(r=>r.quest as string);
export const rankedDone=(runs:DailyRun[],day:string,quest:string)=>runs.find(r=>r.mode==='ranked'&&r.day===day&&r.quest===quest&&r.finishedAt!==null)??null;
export const activeRun=(runs:DailyRun[])=>[...runs].reverse().find(r=>r.finishedAt===null)??null;

export function startRun(pack:DailyPack,quest:Quest,day:string,now:number,runs:DailyRun[],id:string):DailyRun{
  const ranked=!rankedDone(runs,day,quest.id)&&!runs.some(r=>r.mode==='ranked'&&r.day===day&&r.quest===quest.id);
  // every scene opens its own blank journal (feedback F2); the earlier ones are read back only on request
  const drafts:Record<string,Fields>={};for(const s of pack.scenes)drafts[s.id]=blankFields();
  return {id,day,dailyId:dailyIdOf(day,quest.id,pack.id),quest:quest.id,def:{...quest,fields:[...quest.fields]},pack:pack.id,version:pack.version,mode:ranked?'ranked':'practice',
    stage:'lesson',scene:0,drafts,picks:{},decisions:[],startedAt:now,finishedAt:null,result:null};
}
export const setStage=(r:DailyRun,stage:Stage):DailyRun=>r.finishedAt!==null&&stage!=='result'?r:{...r,stage};
export const setDraft=(r:DailyRun,scene:string,f:Partial<Fields>):DailyRun=>r.finishedAt!==null?r:{...r,drafts:{...r.drafts,[scene]:{...blankFields(),...r.drafts[scene],...f}}};
export const setPick=(r:DailyRun,scene:string,f:Fraction|null):DailyRun=>r.finishedAt!==null?r:{...r,picks:{...r.picks,[scene]:f}};
// the hypothesis and the decision are confirmed together; later changes go into the next scene as a new version
export type DecideError='order'|'missing'|'choice';
export function decide(pack:DailyPack,r:DailyRun,sceneId:string,now:number):{run:DailyRun}|{error:DecideError;missing?:FieldKey[]}{
  const s=pack.scenes[r.scene];if(!s||s.id!==sceneId||r.finishedAt!==null||r.stage!=='scene')return {error:'order'};
  const q=defOf(r),f={...blankFields(),...r.drafts[s.id]},m=missingOf(q,f,s);
  if(m.length)return {error:'missing',missing:m};
  const fr=r.picks[s.id];if(!fr)return {error:'choice'};
  const decisions=[...r.decisions,{scene:s.id,fields:{...f},fraction:fr,at:now}];
  const last=r.scene>=pack.scenes.length-1;
  // the next scene's journal is a new one: this one stays as it was confirmed (feedback F2)
  return {run:{...r,decisions,scene:last?r.scene:r.scene+1,stage:last?'result':'scene'}};
}

// the flow: before scene 1 from the first day shown; after a decision from its scene to the next one, or on to the
// evaluation day after the last (the last order fills on the way)
export function playBefore(pack:DailyPack):NonNullable<DailyRun['play']>{const to=pack.scenes[0]?.tick??0;return {from:0,to,at:0,next:'scene'}}
export function playAfter(pack:DailyPack,r:DailyRun):NonNullable<DailyRun['play']>|null{const d=r.decisions[r.decisions.length-1];if(!d)return null;
  const s=pack.scenes.find(x=>x.id===d.scene);if(!s)return null;const last=r.stage==='result'||r.finishedAt!==null;
  const to=last?pack.evalTick:pack.scenes[r.scene]?.tick;if(to===undefined||to<=s.tick)return null;return {from:s.tick,to,at:s.tick,next:last?'result':'scene'}}
export const playAt=(r:DailyRun,at:number):DailyRun=>r.play?{...r,play:{...r.play,at:Math.max(r.play.from,Math.min(r.play.to,Math.round(at)))}}:r;
export const endPlay=(r:DailyRun):DailyRun=>{if(!r.play)return r;const {play:_,...rest}=r;void _;return rest};
// what the account is worth on a day of the flow: the orders filled by then (each at its next open), splits on the way
export function valueAt(p:DailyPack,decisions:Decision[],t:number){
  const done=decisions.filter(d=>{const s=p.scenes.find(x=>x.id===d.scene);return !!s&&s.tick+1<=t});
  const {held,cash,at}=fillsOf(p,done);
  return cash+companiesOf(p).reduce((v,c)=>v+fval(fmul(held[c.slot]??frac(0),splitFactor(p,Math.min(at,t),t,c.slot)))*closeOf(p,c.slot,t),0);
}

// ── fills and performance ─────────────────────────────────────────────────────────────────────────────────────────
export type Fill={scene:string;slot:Slot;tick:number;fraction:Fraction;sold:Frac;left:Frac;price:number;cash:number;fee:number};
export const targetOf=(s:Scene):Slot=>s.target??'A';
export const companiesOf=(p:DailyPack)=>[{slot:'A' as Slot,alias:p.company.alias,business:p.company.business,qty:p.company.qty},...(p.others??[]).map(o=>({slot:o.slot as Slot,alias:o.alias,business:o.business,qty:o.qty}))];
export const aliasOf=(p:DailyPack,slot:Slot)=>companiesOf(p).find(c=>c.slot===slot)?.alias??p.company.alias;
const barsOf=(p:DailyPack,slot:Slot)=>slot==='A'?p.prices:(p.others?.find(o=>o.slot===slot)?.prices??p.prices);
export const closeOf=(p:DailyPack,slot:Slot,t:number)=>{const b=barsOf(p,slot);return b[Math.max(0,Math.min(b.length-1,t))][1]};
export const openOf=(p:DailyPack,slot:Slot,t:number)=>{const b=barsOf(p,slot);return b[Math.max(0,Math.min(b.length-1,t))][0]};
export const closeAt=(p:DailyPack,t:number)=>closeOf(p,'A',t);
export const openAt=(p:DailyPack,t:number)=>openOf(p,'A',t);
// each company's corporate-actions ledger (A: the pack's own; B·C: theirs), applied once on raw prices
const ledgerOf=(p:DailyPack,slot:Slot)=>slot==='A'?{splits:p.splits??[],dividends:p.dividends??[]}:(()=>{const o=p.others?.find(x=>x.slot===slot);return {splits:o?.splits??[],dividends:o?.dividends??[]}})();
// the splits that land after tick `from` up to and including `to`, as one factor (raw prices, shares scaled)
export const splitFactor=(p:DailyPack,from:number,to:number,slot:Slot='A')=>ledgerOf(p,slot).splits.filter(x=>x.tick>from&&x.tick<=to).reduce((f,x)=>fmul(f,frac(x.ratio)),frac(1));
const slotsOf=(p:DailyPack):Slot[]=>['A',...(p.others??[]).map(o=>o.slot)];
// every sale fills at the next trading day's open; a split before it has already multiplied what is held
export function fillsOf(p:DailyPack,decisions:Decision[]){
  const held:Record<string,Frac>={A:frac(p.company.qty)};for(const o of p.others??[])held[o.slot]=frac(o.qty);
  let cash=p.cash,at=p.scenes[0]?.tick??0;const fills:Fill[]=[];
  for(const d of decisions){const s=p.scenes.find(x=>x.id===d.scene);if(!s)continue;const slot=targetOf(s);
    for(const k of slotsOf(p))held[k]=fmul(held[k],splitFactor(p,at,s.tick+1,k));at=s.tick+1;
    const sold=fmul(held[slot]??frac(0),partOf(d.fraction));held[slot]=fsub(held[slot]??frac(0),sold);
    const t=s.tick+1,price=openOf(p,slot,t),gross=fval(sold)*price,fee=gross*feeOf(p);cash+=gross-fee;
    fills.push({scene:s.id,slot,tick:t,fraction:d.fraction,sold,left:held[slot],price,cash,fee})}
  return {qty:held.A,held,cash,fills,at};
}
// what is left of a company after a choice, before it is confirmed (the decision card shows it)
export function leftAfter(p:DailyPack,decisions:Decision[],f:Fraction|null,tick?:number,slot:Slot='A'){const {held,at}=fillsOf(p,decisions);
  const qty=tick!==undefined?fmul(held[slot]??frac(0),splitFactor(p,at,tick,slot)):held[slot]??frac(0);return f?fsub(qty,fmul(qty,partOf(f))):qty}
// 투자 성과 = (end cash + end shares × close) / start total − 1; start = the close of the first scene
// a dividend is paid on the shares a company had going into its ex-date (after every fill of it that settled before)
function dividendsOf(p:DailyPack,fills:Fill[]){let cash=0;const t0=p.scenes[0].tick;
  for(const slot of slotsOf(p)){const qty0=companiesOf(p).find(c=>c.slot===slot)!.qty;
    for(const d of ledgerOf(p,slot).dividends){if(d.tick<=t0||d.tick>p.evalTick)continue;
      const before=fills.filter(f=>f.slot===slot&&f.tick<d.tick),last=before[before.length-1];
      const held=last?fmul(last.left,splitFactor(p,last.tick,d.tick,slot)):fmul(frac(qty0),splitFactor(p,t0,d.tick,slot));cash+=fval(held)*d.perShare}}
  return cash}
export function performance(p:DailyPack,decisions:Decision[]){
  const t0=p.scenes[0].tick,T=p.evalTick,cos=companiesOf(p);
  const start=p.cash+cos.reduce((s,c)=>s+c.qty*closeOf(p,c.slot,t0),0);
  const {qty:q,held,cash,fills,at}=fillsOf(p,decisions),qty=fmul(q,splitFactor(p,at,T));
  // every company counts: the judged ones as sold and kept, the others as held all along (each with its splits)
  const end=cash+dividendsOf(p,fills)+cos.reduce((s,c)=>s+fval(fmul(held[c.slot]??frac(0),splitFactor(p,at,T,c.slot)))*closeOf(p,c.slot,T),0);
  const hold=p.cash+dividendsOf(p,[])+cos.reduce((s,c)=>s+fval(fmul(frac(c.qty),splitFactor(p,t0,T,c.slot)))*closeOf(p,c.slot,T),0);
  const ret=(end/start-1)*100,holdRet=(hold/start-1)*100;
  return {start,end,hold,ret,holdRet,excess:ret-holdRet,qty,cash};
}

// ── XP, titles and investor_progress ──────────────────────────────────────────────────────────────────────────────
export const TITLES=['견습 관측원','보조 관측원','정식 관측원','선임 관측원','수석 관측원'] as const;
export const XP_STEP=100,TOP_STEP=24;
export function titleOf(totalXp:number){
  const step=Math.min(TOP_STEP,Math.floor(Math.max(0,totalXp)/XP_STEP));
  const rank=TITLES[Math.floor(step/5)],level=step%5+1;
  const next=step<TOP_STEP?{rank:TITLES[Math.floor((step+1)/5)],level:(step+1)%5+1,at:(step+1)*XP_STEP,left:(step+1)*XP_STEP-totalXp}:null;
  return {rank,level,step,next,progress:next?(totalXp-step*XP_STEP)/XP_STEP:1};
}
// XP policy v1 (design 10). n = the step the run started at; under the bar for that step the run earns nothing.
export const clamp=(x:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,x));
export function xpFor(startXp:number,excess:number,journal:number){
  const n=Math.min(TOP_STEP,Math.floor(Math.max(0,startXp)/XP_STEP)),bar=Math.min(90,50+2*n);
  if(journal<bar)return {met:false,bar,base:0,market:0,writing:0,bonus:0,xp:0};
  const base=25,market=clamp(Math.round(excess*5+10),0,30),writing=Math.round(journal*.3);
  const bonus=excess>=1+.5*Math.floor(n/5)&&journal>=bar+10?40:0;
  return {met:true,bar,base,market,writing,bonus,xp:base+market+writing+bonus};
}
// profile v5.0 top level; the server derives it from the award ledger (docs: quest-settle), the prototype keeps it locally
export type Award={quest:QuestId;excess:number;journal:number;market:number;writing:number;bonus:number;xp:number;dailyId:string;runId:string;at:number};
export type InvestorProgress={total_xp:number;rank:string;level:number;awards:Award[]};
export const blankProgress=():InvestorProgress=>({total_xp:0,rank:TITLES[0],level:1,awards:[]});
export function award(p:InvestorProgress,a:Award):InvestorProgress{
  // one award per run and per (day, pack, quest): asking again pays nothing
  if(p.awards.some(x=>x.runId===a.runId||x.dailyId===a.dailyId))return p;
  const total=p.total_xp+a.xp,t=titleOf(total);
  return {total_xp:total,rank:t.rank,level:t.level,awards:[...p.awards,a]};
}

export type DimKey='philosophy'|'evidence'|'logic'|'review';
export type DimGrade={key:DimKey;grade:0|1|2|3;quote:string;cards:string[];reason:string};
export type SceneGrade={scene:string;score:number;dims:DimGrade[];next:string};
export type RunResult={ret:number;holdRet:number;excess:number;journal:number;scenes:SceneGrade[];xp:ReturnType<typeof xpFor>&{startXp:number};
  // the judge that scored it (the rule-based trial judge until the server's Toulmin judge)
  judge:string;late:boolean;
  // the server's judge could not answer yet (design 7): the returns are shown, the journal score, ranking and XP wait
  pending?:boolean;
  // 예측력 (forecast.ts): judged apart from the journal score, with its own denominator
  forecast?:{items:{scene:string;status:'hit'|'miss'|'hold'|'void';direction?:'상승'|'하락';horizon?:number;change?:number;
    observe?:{label:string;base:string;flat:number;dir:Dir;said?:Dir}}[];n:number;k:number;hold:number;void:number}};
