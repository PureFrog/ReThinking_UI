// What the models flagged today, as research notes (redesign 4-1 briefing). Only this file knows where signals come
// from: today a mock. The demo companies (app/content/demo-garden.ts) have hand-written notes; any other company the
// player planted gets one made from its loss and a hash of its name (made-up numbers). The server (R5) replaces
// signalProvider with the team's model output without touching the scene or the UI.
// counter: luon's argument against each choice the player might make (redesign 3장 반박).
import type {AnalystId,ModelId} from './analysts';
import type {Choice} from '../core/judgment';
import type {Holding} from '../core/model';
export type Fact={k:string;v:string};
export type Signal={id:string;holdingId:number;analyst:AnalystId;model:ModelId;loss:boolean;headline:string;evidence:Fact[];say:string;
  counter:Record<Choice,string>;deep?:{title:string;items:{k:string;ok:boolean}[]}};
const FSCORE=(ok:number[]):Signal['deep']=>({title:'F-score 9항목',items:['순이익 흑자','영업현금흐름 흑자','ROA 개선','현금흐름 > 순이익','부채비율 하락','유동비율 개선','신주 발행 없음','매출총이익률 개선','자산회전율 개선'].map((k,i)=>({k,ok:ok.includes(i)}))});
const ALL:(Omit<Signal,'id'|'holdingId'>&{name:string})[]=[
  {name:'강철중공업',analyst:'tori',model:'ohlson',loss:true,headline:'부도 위험 2분기째 상승',
    evidence:[{k:'부도 확률(O-score)',v:'9% → 17%'},{k:'부채비율',v:'182% → 214%'},{k:'이자보상배율',v:'1.1배'}],
    say:'이자 내고 나면 남는 게 거의 없어.',
    counter:{hold:'이자보상 1배면 금리 한 번에 적자야.',review:'수주잔고는 3년치야. 버틸 체력은 있어.',watch:'기준부터. 이자보상 1배 깨지면 다시 보자.'},
    deep:FSCORE([0,6,7])},
  {name:'꽃빛뷰티',analyst:'moa',model:'gradual',loss:true,headline:'저점이 3주째 낮아지는 중',
    evidence:[{k:'20일선 아래',v:'18거래일'},{k:'고점 대비',v:'-16%'},{k:'거래량',v:'평균의 0.7배'}],
    say:'급하진 않아. 대신 꾸준해. 그게 더 무서워.',
    counter:{hold:'거래량 없는 하락은 길어지는 편이야.',review:'거래량 없는 하락은 바닥도 조용해.',watch:'기준선 하나. 전저점 깨지면 다시 보자.'}},
  {name:'은하바이오',analyst:'moa',model:'crash',loss:true,headline:'하루 -7.8%, 거래량 4배',
    evidence:[{k:'당일 등락',v:'-7.8%'},{k:'거래량',v:'20일 평균의 4.1배'},{k:'시가 갭',v:'-5.2%'}],
    say:'뉴스 확인 전에 움직이지 마.',
    counter:{hold:'거래량 터진 급락은 보통 이유가 있어.',review:'원인 모르고 정하면 복기가 안 돼.',watch:'원인부터. 공시 나오면 다시 보자.'}},
  {name:'달빛스튜디오',analyst:'tori',model:'fscore',loss:true,headline:'재무 체력 9점 중 2점',
    evidence:[{k:'영업현금흐름',v:'3분기 연속 적자'},{k:'유동비율',v:'0.8배'},{k:'신주 발행',v:'최근 1년 2회'}],
    say:'숫자가 전부 같은 방향이야.',
    counter:{hold:'손실 90일째야. 산 이유가 아직 있어?',review:'신작 하나에 실적이 뒤집히는 업종이야.',watch:'얼마나 더 볼지 날짜부터 정해.'},
    deep:FSCORE([0,7])},
  {name:'새봄반도체',analyst:'tori',model:'dupont',loss:false,headline:'ROE 상승, 근데 출처가 빚',
    evidence:[{k:'ROE',v:'11% → 15%'},{k:'순이익률',v:'거의 그대로'},{k:'레버리지',v:'1.6배 → 2.1배'}],
    say:'잘 번 게 아니라 빚을 늘린 거야.',
    counter:{hold:'빚으로 올린 ROE는 금리에 약해.',review:'설비 투자 빚이면 내년 매출로 돌아와.',watch:'다음 분기 순이익률 보자. 그게 진짜야.'}},
];
const hash=(t:string)=>{let h=2166136261;for(const c of t)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h};
// a note for a company with no hand-written one: the loss picks the model, the name's hash picks the numbers
export function madeSignal(h:Holding):Omit<Signal,'id'>|null{
  const r=hash(h.name),n=(lo:number,hi:number)=>lo+r%(hi-lo+1);
  if(h.rate<=-20)return {holdingId:h.id,analyst:'tori',model:'fscore',loss:true,headline:`재무 체력 9점 중 ${n(1,3)}점`,
    evidence:[{k:'영업현금흐름',v:`${n(2,4)}분기 연속 적자`},{k:'유동비율',v:`0.${n(6,9)}배`},{k:'수익률',v:`${h.rate}%`}],
    say:'숫자가 전부 같은 방향이야.',
    counter:{hold:'산 이유가 아직 있어? 그것부터.',review:'적자 업종은 한 분기에 뒤집히기도 해.',watch:'얼마나 더 볼지 날짜부터 정해.'},
    deep:FSCORE([0,7,r%9].slice(0,n(1,3)))};
  if(h.rate<=-8)return {holdingId:h.id,analyst:'moa',model:'gradual',loss:true,headline:`저점이 ${n(2,4)}주째 낮아지는 중`,
    evidence:[{k:'20일선 아래',v:`${n(10,24)}거래일`},{k:'고점 대비',v:`${Math.round(h.rate*1.2)}%`},{k:'거래량',v:`평균의 0.${n(5,9)}배`}],
    say:'급하진 않아. 대신 꾸준해.',
    counter:{hold:'거래량 없는 하락은 길어지는 편이야.',review:'조용한 하락은 바닥도 조용해.',watch:'기준선 하나. 전저점 깨지면 다시 보자.'}};
  if(h.rate<0&&r%3===0)return {holdingId:h.id,analyst:'moa',model:'crash',loss:true,headline:`하루 -${n(5,9)}.${n(0,9)}%, 거래량 ${n(3,5)}배`,
    evidence:[{k:'거래량',v:`20일 평균의 ${n(3,5)}배`},{k:'시가 갭',v:`-${n(2,6)}%`},{k:'수익률',v:`${h.rate}%`}],
    say:'뉴스 확인 전에 움직이지 마.',
    counter:{hold:'거래량 터진 급락은 보통 이유가 있어.',review:'원인 모르고 정하면 복기가 안 돼.',watch:'원인부터. 공시 나오면 다시 보자.'}};
  if(h.rate>=10&&r%2===0)return {holdingId:h.id,analyst:'tori',model:'dupont',loss:false,headline:'ROE 상승, 근데 출처가 빚',
    evidence:[{k:'ROE',v:`${n(8,12)}% → ${n(14,18)}%`},{k:'순이익률',v:'거의 그대로'},{k:'레버리지',v:`1.${n(3,6)}배 → 2.${n(0,3)}배`}],
    say:'잘 번 게 아니라 빚을 늘린 거야.',
    counter:{hold:'빚으로 올린 ROE는 금리에 약해.',review:'설비 투자 빚이면 내년 매출로 돌아와.',watch:'다음 분기 순이익률 보자. 그게 진짜야.'}};
  return null;
}
export function mockSignals(holdings:Holding[],day:string):Signal[]{
  return holdings.flatMap(h=>{const hand=ALL.find(s=>s.name===h.name);let s:Omit<Signal,'id'>|null=null;
    if(hand){const {name:_n,...rest}=hand;s={...rest,holdingId:h.id}}else s=madeSignal(h);
    return s?[{...s,id:`${s.model}:${h.id}:${day}`}]:[]});
}
export type SignalProvider={today(holdings:Holding[],day:string):Signal[]};
export const signalProvider:SignalProvider={today:mockSignals};
