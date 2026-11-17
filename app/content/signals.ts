// What the models flagged today, as research notes (redesign 4-1 briefing). Only this file knows where signals come
// from: today a mock. The demo companies (app/content/demo-garden.ts) have hand-written notes; any other company the
// player planted gets one made from its loss and a hash of its name (made-up numbers). The server (R5) replaces
// signalProvider with the team's model output without touching the scene or the UI.
// say: the analyst's own words on the note (tori: the books, plainly; moa: the chart, quick to react).
// counter: luon's argument against each choice the player might make, asked as a question (redesign 3장 반박).
import type {AnalystId,ModelId} from './analysts';
import type {Choice} from '../core/judgment';
import type {Holding} from '../core/model';
import {bars} from '../core/jigi/stocks';
import {readBars,priceFlag,fmtPct} from '../core/real';
export type Fact={k:string;v:string};
export type Signal={id:string;holdingId:number;analyst:AnalystId;model:ModelId;loss:boolean;headline:string;evidence:Fact[];say:string;
  counter:Record<Choice,string>;deep?:{title:string;items:{k:string;ok:boolean}[]}};
const FSCORE=(ok:number[]):Signal['deep']=>({title:'F-score 9항목',items:['순이익 흑자','영업현금흐름 흑자','ROA 개선','현금흐름 > 순이익','부채비율 하락','유동비율 개선','신주 발행 없음','매출총이익률 개선','자산회전율 개선'].map((k,i)=>({k,ok:ok.includes(i)}))});
const ALL:(Omit<Signal,'id'|'holdingId'>&{name:string})[]=[
  {name:'POSCO홀딩스',analyst:'tori',model:'ohlson',loss:true,headline:'부도 위험 2분기째 상승',
    evidence:[{k:'부도 확률(O-score)',v:'9% → 17%'},{k:'부채비율',v:'182% → 214%'},{k:'이자보상배율',v:'1.1배'}],
    say:'이자 내고 나면 남는 게 거의 없더라. 두 분기째야.',
    counter:{hold:'이자보상 1.1배야. 금리 한 번 오르면 어떡해?',review:'수주잔고 3년치는? 그건 버틸 체력이잖아.',watch:'좋아. 근데 이자보상 1배 깨지면 그땐?'},
    deep:FSCORE([0,6,7])},
  {name:'카카오',analyst:'moa',model:'gradual',loss:true,headline:'저점이 3주째 낮아지는 중',
    evidence:[{k:'20일선 아래',v:'18거래일'},{k:'고점 대비',v:'-16%'},{k:'거래량',v:'평균의 0.7배'}],
    say:'어, 급하게 빠지진 않아. 근데 3주째 꾸준히 내려와.',
    counter:{hold:'조용히 빠지는 건 길게 가던데. 버틸 이유 있어?',review:'조용한 하락은 바닥도 조용히 와. 너무 이르지 않아?',watch:'보는 건 좋아. 전저점 깨지면 그땐 뭐 할 건데?'}},
  {name:'삼성전자',analyst:'moa',model:'crash',loss:true,headline:'하루 -7.8%, 거래량 4배',
    evidence:[{k:'당일 등락',v:'-7.8%'},{k:'거래량',v:'20일 평균의 4.1배'},{k:'시가 갭',v:'-5.2%'}],
    say:'잠깐만, 이건 뉴스부터 봐야 돼. 4배는 그냥 안 터져.',
    counter:{hold:'거래량 4배 터진 급락이야. 이유도 모르고 버텨?',review:'원인도 모르고 정하면 나중에 복기는 어떻게 해?',watch:'공시 나올 때까지? 안 나오면 언제까지 볼 건데?'}},
  {name:'현대차',analyst:'tori',model:'fscore',loss:true,headline:'재무 체력 9점 중 2점',
    evidence:[{k:'영업현금흐름',v:'3분기 연속 적자'},{k:'유동비율',v:'0.8배'},{k:'신주 발행',v:'최근 1년 2회'}],
    say:'9개 중 7개가 같은 쪽을 가리켜. 흔한 일 아니야.',
    counter:{hold:'손실 90일째야. 산 이유가 아직 남아 있어?',review:'신작 하나에 실적이 뒤집히는 업종인 건 알지?',watch:'얼마나 더 볼지 날짜는 정했어?'},
    deep:FSCORE([0,7])},
  {name:'SK하이닉스',analyst:'tori',model:'dupont',loss:false,headline:'ROE 상승, 근데 출처가 빚',
    evidence:[{k:'ROE',v:'11% → 15%'},{k:'순이익률',v:'거의 그대로'},{k:'레버리지',v:'1.6배 → 2.1배'}],
    say:'이익률은 그대로인데 ROE만 올랐어. 빚 덕분이야.',
    counter:{hold:'빚으로 올린 ROE는 금리에 약해. 그것도 봤어?',review:'설비 투자 빚이면 내년 매출로 돌아올 수도 있잖아.',watch:'좋아. 다음 분기 순이익률, 그게 진짜 답이야.'}},
];
const hash=(t:string)=>{let h=2166136261;for(const c of t)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h};
// a note for a company with no hand-written one: the loss picks the model, the name's hash picks the numbers
export function madeSignal(h:Holding):Omit<Signal,'id'>|null{
  const r=hash(h.name),n=(lo:number,hi:number)=>lo+r%(hi-lo+1);
  if(h.rate<=-20)return {holdingId:h.id,analyst:'tori',model:'fscore',loss:true,headline:`재무 체력 9점 중 ${n(1,3)}점`,
    evidence:[{k:'영업현금흐름',v:`${n(2,4)}분기 연속 적자`},{k:'유동비율',v:`0.${n(6,9)}배`},{k:'수익률',v:`${h.rate}%`}],
    say:'현금흐름부터 막혀 있어. 숫자가 다 한쪽으로 가.',
    counter:{hold:'산 이유, 지금도 그대로야? 그것부터 보자.',review:'적자 업종은 한 분기에 뒤집히기도 하는데?',watch:'얼마나 더 볼지 날짜는 정했어?'},
    deep:FSCORE([0,7,r%9].slice(0,n(1,3)))};
  if(h.rate<=-8)return {holdingId:h.id,analyst:'moa',model:'gradual',loss:true,headline:`저점이 ${n(2,4)}주째 낮아지는 중`,
    evidence:[{k:'20일선 아래',v:`${n(10,24)}거래일`},{k:'고점 대비',v:`${Math.round(h.rate*1.2)}%`},{k:'거래량',v:`평균의 0.${n(5,9)}배`}],
    say:'급하진 않은데, 저점이 계속 한 칸씩 내려와.',
    counter:{hold:'조용히 빠지는 건 길게 가던데. 버틸 이유 있어?',review:'조용한 하락은 바닥도 조용히 와. 너무 이르지 않아?',watch:'보는 건 좋아. 전저점 깨지면 그땐 뭐 할 건데?'}};
  if(h.rate<0&&r%3===0)return {holdingId:h.id,analyst:'moa',model:'crash',loss:true,headline:`하루 -${n(5,9)}.${n(0,9)}%, 거래량 ${n(3,5)}배`,
    evidence:[{k:'거래량',v:`20일 평균의 ${n(3,5)}배`},{k:'시가 갭',v:`-${n(2,6)}%`},{k:'수익률',v:`${h.rate}%`}],
    say:'어, 거래량이 확 튀었어. 이유부터 찾자.',
    counter:{hold:'거래량 터진 급락이야. 이유도 모르고 버텨?',review:'원인도 모르고 정하면 나중에 복기는 어떻게 해?',watch:'공시 나올 때까지? 안 나오면 언제까지 볼 건데?'}};
  if(h.rate>=10&&r%2===0)return {holdingId:h.id,analyst:'tori',model:'dupont',loss:false,headline:'ROE 상승, 근데 출처가 빚',
    evidence:[{k:'ROE',v:`${n(8,12)}% → ${n(14,18)}%`},{k:'순이익률',v:'거의 그대로'},{k:'레버리지',v:`1.${n(3,6)}배 → 2.${n(0,3)}배`}],
    say:'이익률은 그대로인데 ROE만 올랐어. 빚 덕분이야.',
    counter:{hold:'빚으로 올린 ROE는 금리에 약해. 그것도 봤어?',review:'설비 투자 빚이면 내년 매출로 돌아올 수도 있잖아.',watch:'좋아. 다음 분기 순이익률, 그게 진짜 답이야.'}};
  return null;
}
// a tree on real prices (core/real.ts): only moa, only what the real bars show (as of the latest close)
export function realSignal(h:Holding):Omit<Signal,'id'>|null{
  if(!h.code)return null;const r=readBars(h,bars(h.code));if(!r)return null;const flag=priceFlag(r);
  if(flag==='crash')return {holdingId:h.id,analyst:'moa',model:'crash',loss:true,headline:`하루 ${fmtPct(r.dayMove)}, 거래량 ${r.volX}배`,
    evidence:[{k:'당일 등락',v:fmtPct(r.dayMove)},{k:'거래량',v:`20일 평균의 ${r.volX}배`},{k:'산 가격 대비',v:fmtPct(r.rate)},{k:'기준일',v:r.asOf}],
    say:'어, 거래량이 확 튀었어. 이유부터 찾자.',
    counter:{hold:'거래량 터진 급락이야. 이유도 모르고 버텨?',review:'원인도 모르고 정하면 나중에 복기는 어떻게 해?',watch:'공시 나올 때까지? 안 나오면 언제까지 볼 건데?'}};
  if(flag==='gradual')return {holdingId:h.id,analyst:'moa',model:'gradual',loss:true,headline:`20일선 아래 ${r.below20}거래일째`,
    evidence:[{k:'20일선 아래',v:`${r.below20}거래일`},{k:'산 뒤 고점 대비',v:fmtPct(r.fromHigh)},{k:'산 가격 대비',v:fmtPct(r.rate)},{k:'기준일',v:r.asOf}],
    say:'급하진 않은데, 20일선 밑에서 계속 머물러.',
    counter:{hold:'조용히 빠지는 건 길게 가던데. 버틸 이유 있어?',review:'조용한 하락은 바닥도 조용히 와. 너무 이르지 않아?',watch:'보는 건 좋아. 전저점 깨지면 그땐 뭐 할 거야?'}};
  return null;
}
export function mockSignals(holdings:Holding[],day:string):Signal[]{
  return holdings.flatMap(h=>{const hand=h.real?null:ALL.find(s=>s.name===h.name);let s:Omit<Signal,'id'>|null=null;
    if(h.real)s=realSignal(h);
    else if(hand){const {name:_n,...rest}=hand;s={...rest,holdingId:h.id}}else s=madeSignal(h);
    return s?[{...s,id:`${s.model}:${h.id}:${day}`}]:[]});
}
export type SignalProvider={today(holdings:Holding[],day:string):Signal[]};
export const signalProvider:SignalProvider={today:mockSignals};

// 되돌아보기 needs a note even when nothing in the garden is flagged (stocks typed in that are up, or barely down):
// moa's plain chart note on the tree that moved most, not a loss signal. Only the first visit uses it.
export function lookbackNote(holdings:Holding[]):Signal|null{
  if(!holdings.length)return null;
  const h=[...holdings].sort((a,b)=>Math.abs(b.rate)-Math.abs(a.rate))[0],r=hash(h.name),n=(lo:number,hi:number)=>lo+r%(hi-lo+1),up=h.rate>=0;
  return {id:`look:${h.id}`,holdingId:h.id,analyst:'moa',model:'gradual',loss:false,headline:up?`20일선 위에서 ${n(2,4)}주째`:`20일선 근처에서 ${n(2,4)}주째 옆걸음`,
    evidence:[{k:'20일선',v:up?`위 ${n(8,18)}거래일`:`위아래 ${n(6,12)}번`},{k:'거래량',v:`평균의 ${n(8,12)/10}배`},{k:'수익률',v:`${h.rate}%`}],
    say:up?'차트는 조용히 위쪽이야. 이럴 때 뭘 근거로 들고 있었는지 적어 두면 좋아.':'방향이 아직 안 정해졌어. 그때 너라면 어느 쪽으로 봤을까?',
    counter:{hold:'계속 들고 있을 이유, 한 줄로 말할 수 있어?',review:'흔들리는 구간에서 정리하면 나중에 아쉽지 않을까?',watch:'언제까지 볼지 날짜는 정했어?'}};
}
