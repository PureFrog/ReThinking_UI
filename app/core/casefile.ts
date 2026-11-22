// 사건철 (PM 설계 2026-11-19 4장): the desk as an investigation table on top of the 관측소 판 (core/game). The run is the
// same state machine (core/game/play.ts); what changes is the decision: read the papers that had arrived by then, put
// two side by side, write a direction and a reason (with the lines picked as evidence), choose how much of the holding
// to keep (보유 · 1/8 · 1/4 · 1/2 매도), and only then does the clock run on. Earlier pages are read only.
// No future: the papers are only what was out by the moment's day (pack.seen), the next report comes when time gets there.
import {barAt,company,fscoreOn,maskTitle,seen,F_ITEMS,type GamePack,type GameEvent} from './game/pack';
import {simulate,returnOf} from './game/engine';
import {momentAt,qtyHeld,type Play} from './game/play';
import {HORIZON} from './game/grade';

// 거장 수업: the principle practised in this file and when it applies. Paraphrased principles only; a master's own
// trade is named only where a source is given (none here yet)
export type Master={id:string;name:string;principle:string;when:string;ask:string};
export const MASTERS:Master[]=[
  {id:'lynch',name:'피터 린치',principle:'왜 이 회사를 갖고 있는지 두 문장으로 말할 수 있어야 한다.',when:'가격이 크게 움직인 날, 처음 산 이유가 아직 맞는지 볼 때',ask:'가진 이유를 두 문장으로 적어 봐.'},
  {id:'fisher',name:'필립 피셔',principle:'숫자보다 사업이 계속 자랄 수 있는지를 먼저 본다.',when:'실적 발표로 지표가 바뀐 날',ask:'이번 숫자가 사업의 어느 부분을 말하는지 적어 봐.'},
  {id:'graham',name:'벤저민 그레이엄',principle:'시장의 기분과 회사의 값어치를 따로 본다.',when:'시장 전체가 같이 빠진 날',ask:'회사 사정인지 시장 기분인지 근거로 나눠 봐.'},
  {id:'marks',name:'하워드 막스',principle:'남들이 다 아는 이야기는 이미 가격에 들어 있을 수 있다.',when:'기사가 쏟아진 날',ask:'기사에 없는 걸 하나 찾아봐.'},
];
export const masterOf=(packId:string,n:number)=>MASTERS[(hash(packId)+n)%MASTERS.length];
const hash=(s:string)=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h};

// today's file: the same for everyone on a day, files already solved skipped while any are left
export function packOfDay(ids:string[],day:string,done:string[]=[]){
  const left=ids.filter(i=>!done.includes(i)),pool=left.length?left:ids;return pool.length?pool[hash('case:'+day)%pool.length]:null;
}

// a paper on the desk: a headline, a crash memo or a report memo, cut into lines that can be pointed at
export type Doc={id:string;d:string;kind:'news'|'crash'|'earnings';code:string|null;title:string;lines:string[];from:string};
const won=(n:number)=>Math.round(n).toLocaleString('ko-KR');
export function eventDoc(pack:GamePack,e:GameEvent):Doc{
  const slot='회사 '+(company(pack,e.code)?.slot??'?');
  if(e.kind==='crash')return {id:`ev:${e.d}:${e.code}`,d:e.d,kind:'crash',code:e.code,from:'급락 메모',title:`${slot} 하루 ${e.ret.toFixed(1)}% 하락`,
    lines:[`${e.d} ${slot} 종가가 하루에 ${e.ret.toFixed(2)}% 움직였다.`,`같은 날 시장 지수는 ${e.idx>0?'+':''}${e.idx.toFixed(2)}%였다.`,`시장을 뺀 움직임은 ${e.ar.toFixed(2)}%다.`,
      ...e.evidence.map(x=>maskTitle(pack,x.label)),...(e.evidence.length?[]:['이날 회사에서 나온 공시나 기사는 아직 확인되지 않았다.'])]};
  const changed=e.prevItems?e.items.map((v,i)=>v!==e.prevItems![i]?`${F_ITEMS[i]}: ${e.prevItems![i]?'예':'아니오'} → ${v?'예':'아니오'}`:null).filter(Boolean) as string[]:[];
  return {id:`ev:${e.d}:${e.code}`,d:e.d,kind:'earnings',code:e.code,from:'실적 메모',title:`${slot} ${e.fy}년 실적 발표`,
    lines:[`${slot}의 ${e.fy}년 사업보고서가 나왔다.`,`재무 점검 9항목 중 ${e.f}개가 통과했다${e.prevF!==null?` (전년 ${e.prevF}개)`:''}.`,...(changed.length?changed:['전년과 달라진 항목은 없다.'])]};
}
// everything out by a tick: the moment's own memo first, then the newest headlines (only what had landed)
export function docsAt(pack:GamePack,tick:number,code?:string|null,limit=12):Doc[]{
  const ev=seen(pack.events,pack,tick).map(e=>eventDoc(pack,e)).reverse();
  const news=seen(pack.news,pack,tick).filter(n=>!code||n.codes.includes(code)).slice(-limit).reverse()
    .map((n,i)=>({id:`nw:${n.d}:${i}:${n.u.slice(-12)}`,d:n.d,kind:'news' as const,code:n.codes[0]??null,from:n.p,title:maskTitle(pack,n.t),lines:[maskTitle(pack,n.t),`${n.d} · ${n.p}`]}));
  const mine=ev.filter(e=>!code||e.code===code),rest=ev.filter(e=>code&&e.code!==code);
  return [...mine,...news,...rest.slice(0,2)];
}

// a decision page in the notebook
export type Direction='up'|'down'|'flat';
export const DIRECTION_LABEL:Record<Direction,string>={up:'오를 것 같다',flat:'비슷할 것 같다',down:'내릴 것 같다'};
export type Sell=0|0.125|0.25|0.5;
export const SELL_LABEL:[Sell,string][]=[[0,'보유'],[0.125,'1/8 매도'],[0.25,'1/4 매도'],[0.5,'1/2 매도']];
export type Evidence={docId:string;line:number;text:string};
export type Page={tick:number;code:string;kind:GameEvent['kind'];direction:Direction;reason:string;evidence:Evidence[];counter:string;sell:Sell;days?:number};
// a draft can stand without a direction yet; the page is confirmed only with direction and reason
export type Draft={direction:Direction|null;reason:string;evidence:Evidence[];counter:string;sell:Sell|null;days:number};
export const DRAFT0:Draft={direction:null,reason:'',evidence:[],counter:'',sell:null,days:HORIZON};
export const PERIODS=[5,10,20,40];

// mastery: how much 보리 leaves to the player (설계 4장 처음 해금한 사용자)
//   0 first file: 보리 puts a paper on the compare spot, target and period printed; direction and one line of reason
//   1+  the player picks the evidence (at least one line)
//   2+  also a counter-example
//   3+  also the period to check the guess over
export type Mastery={guided:boolean;needEvidence:boolean;needCounter:boolean;choosePeriod:boolean};
export const masteryOf=(solved:number):Mastery=>({guided:solved===0,needEvidence:solved>=1,needCounter:solved>=2,choosePeriod:solved>=3});
export function missing(d:Draft,m:Mastery):string[]{
  const out:string[]=[];if(!d.direction)out.push('방향');if(!d.reason.trim())out.push('이유');
  if(m.needEvidence&&!d.evidence.length)out.push('근거');if(m.needCounter&&!d.counter.trim())out.push('반례');if(d.sell===null)out.push('보유 수량');return out;
}

// the judgment and the order together: the moment is closed (as 지킴 or 절반 in the 판's record, chips 0: this desk
// grades the reasoning, not chips) and the sell, if any, fills at the next open like any order of the 판
export function confirmPage(pack:GamePack,p:Play,page:Omit<Page,'tick'|'code'|'kind'>):{play:Play;page:Page}|null{
  const m=p.moment;if(p.phase!=='moment'||!m)return null;
  const qty=qtyHeld(pack,p,m.code),sellQty=Math.floor(qty*page.sell);
  const orders=sellQty>0?[...p.orders,{seq:p.orders.length,tick:m.tick,code:m.code,side:'sell' as const,qty:sellQty}]:p.orders;
  const next:Play={...p,phase:'flow',moment:null,orders,decisions:[...p.decisions,{tick:m.tick,code:m.code,choice:page.sell===0?'지킴':'절반',chips:0,kind:m.kind}]};
  const again=momentAt(pack,next);
  return {play:again?{...next,phase:'moment',moment:again}:next,page:{...page,tick:m.tick,code:m.code,kind:m.kind}};
}

// the guess checked: the close HORIZON trading days on against the moment's close (within ±2% is flat)
export const FLAT_PCT=2;
export function moveAfter(pack:GamePack,code:string,tick:number,days=HORIZON){
  const a=barAt(pack,code,tick)?.[4],b=barAt(pack,code,tick+days)?.[4];return a&&b?(b/a-1)*100:0;
}
export const directionOf=(pct:number):Direction=>pct>FLAT_PCT?'up':pct< -FLAT_PCT?'down':'flat';
export type PageVerdict={page:Page;move:number;actual:Direction;hit:boolean;fix:string[]};
export function judgePage(pack:GamePack,page:Page):PageVerdict{
  const move=moveAfter(pack,page.code,page.tick,page.days??HORIZON),actual=directionOf(move),fix:string[]=[];
  if(!page.evidence.length)fix.push('판단에 붙인 근거 문장이 없었어.');
  if(page.evidence.length&&page.evidence.every(e=>e.docId.startsWith('nw:')))fix.push('기사만 근거로 썼어. 공시·실적 메모와도 대조해 봐.');
  if(!page.counter.trim())fix.push('반대로 볼 이유를 적지 않았어.');
  if(page.reason.trim().length<8)fix.push('이유가 한 마디라 나중에 다시 읽기 어려워.');
  return {page,move,actual,hit:actual===page.direction,fix};
}
// the back of the file: my return, holding on to everything, and the notebook score (the reasoning, not the returns)
export function caseResult(pack:GamePack,p:Play,pages:Page[]){
  const me=returnOf(simulate(pack,p.orders)),hold=returnOf(simulate(pack,[]));
  const v=pages.map(x=>judgePage(pack,x));
  // per page: a reason 1, evidence 1, a counter-example 1, the guess right 1 → out of 100
  const pts=v.reduce((s,x)=>s+(x.page.reason.trim()?1:0)+(x.page.evidence.length?1:0)+(x.page.counter.trim()?1:0)+(x.hit?1:0),0);
  const score=v.length?Math.round(pts/(v.length*4)*100):0;
  const start=Object.fromEntries(pack.companies.filter(c=>c.start==='held').map(c=>[c.code,c.qty]));
  const end=simulate(pack,p.orders).positions;
  const held=pack.companies.filter(c=>c.start==='held').map(c=>({code:c.code,name:c.name,slot:c.slot,start:start[c.code]??0,end:end[c.code]?.qty??0}));
  return {me,hold,score,verdicts:v,hits:v.filter(x=>x.hit).length,held,startCash:won(pack.cash)};
}

// what 보리 asks about the paper on the desk: once per paper, from what it is (never what to do, never a price call)
export function boriAsk(doc:Doc|null,first:boolean):string|null{
  if(!doc)return null;
  if(doc.kind==='crash')return first?'하루에 크게 빠졌네. 회사 사정 때문인지 시장 전체 때문인지, 옆에 뭘 놓고 보면 알 수 있을까?':'시장 지수랑 같이 놓고 봐. 이 하락 중에 회사 몫이 얼마야?';
  if(doc.kind==='earnings')return '점검 항목이 바뀌었네. 어느 줄이 바뀌었는지 짚어 볼래?';
  return '이 기사는 그날 나온 거야. 같은 날 다른 자료랑 맞춰 보면 뭐가 보여?';
}
// the bookmark: everything needed to open the file again where it was closed
export type Bookmark={v:1;packId:string;day:string;master?:string;play:Play;pages:Page[];draft:Draft;compare:(string|null)[];asked:string[];cover:boolean;ended:boolean};
export const fscoreLine=(pack:GamePack,code:string,d:string)=>{const f=fscoreOn(pack,code,d);return f?`최근 재무 점검 ${f.f}/9 (${f.fy}년)`:'재무 점검 자료 없음'};
