// 관측소 원정 (docs/game.md): one 판 = a blind window of the real past. Packs are built by tools/game/build-packs.mjs from
// the model repo (prices, crash verdicts, F-score, news titles) and live in public/game/packs/. The layout follows
// sonjeol-game's scenario pack (pre-history, play days, epilogue), trimmed to what this game uses.
export type Bar=[d:string,o:number,h:number,l:number,c:number,v:number];
export type Slot='A'|'B'|'C'|'D'|'E'|'F'|'G';
// held at the start, or waiting in the pool for a swap (정리 → a new company comes in)
export type GameCompany={code:string;name:string;slot:Slot;start:'held'|'reserve';qty:number};
export type Evidence={label:string;dir:'긍정'|'부정'|'중립'};
// a real crash day (market-adjusted, z <= -2) with the crash model's verdict and its evidence labels (no article text)
export type CrashEvent={kind:'crash';d:string;code:string;ret:number;idx:number;ar:number;z:number;verdict:'가치훼손'|'비가치'|'판단보류'|null;evidence:Evidence[]};
// an annual report day: the F-score that became known that day, and the year before
export type EarningsEvent={kind:'earnings';d:string;code:string;fy:number;f:number;prevF:number|null;items:number[];prevItems:number[]|null};
export type GameEvent=CrashEvent|EarningsEvent;
// a headline as it landed: d is the trading day it shows on (after 15:30 → next day)
export type NewsItem={d:string;at:string;t:string;p:string;u:string;codes:string[]};
export type FScorePoint={disc:string;fy:number;f:number;items:number[]};
export type Regime='상승장'|'하락장'|'박스권';
export type GamePack={
  v:1;id:string;
  titleHidden:string;titleRevealed:string;summaryRevealed:string;regime:Regime;
  days:string[];preDays:number;epiDays:number;
  cash:number;companies:GameCompany[];
  prices:Record<string,Bar[]>;index:[string,number][];
  news:NewsItem[];events:GameEvent[];
  fscore:Record<string,FScorePoint[]>;ohlson:Record<string,[string,string][]>;
};
export type PackIndex={v:1;built:string;packs:{id:string;regime:Regime;decisions:number;titleHidden:string}[]};

export const F_ITEMS=['ROA 흑자','영업현금 흑자','ROA 개선','이익의 질','부채 감소','유동성 개선','증자 없음','마진 개선','회전율 개선'];

// KOSDAQ tick size before the 2023-01-25 change (the packs cover 2015~2019)
export const tickOf=(p:number)=>p<1000?1:p<5000?5:p<10000?10:p<50000?50:100;
// ±30% from the previous close, trimmed to the tick size (sonjeol-game engine, DATA_SOURCES §1)
export function limits(prev:number){
  const u=tickOf(prev),w=Math.floor(prev*.3/u)*u;
  const up=prev+w,lo=prev-w;
  return {upper:Math.floor(up/tickOf(up))*tickOf(up),lower:Math.ceil(lo/tickOf(lo))*tickOf(lo)};
}

const cache=new WeakMap<GamePack,Record<string,Map<string,number>>>();
function rowIndex(pack:GamePack,code:string){
  let c=cache.get(pack);if(!c){c={};cache.set(pack,c)}
  let m=c[code];if(!m){m=new Map((pack.prices[code]??[]).map((b,i)=>[b[0],i]));c[code]=m}
  return m;
}
// the bar of a play tick (tick 0 = first play day); ticks past the end read the epilogue
export function barAt(pack:GamePack,code:string,tick:number):Bar|null{
  const s=pack.prices[code];if(!s)return null;
  const i=rowIndex(pack,code).get(pack.days[0]);if(i===undefined)return null;
  return s[Math.max(0,Math.min(s.length-1,i+tick))]??null;
}
export const closeBefore=(pack:GamePack,code:string)=>barAt(pack,code,-1)?.[4]??0;
export const tickOfDay=(pack:GamePack,d:string)=>pack.days.indexOf(d);
// everything a screen may show at a tick: nothing after it (no peeking at the future)
export function seen<T extends {d:string}>(list:T[],pack:GamePack,tick:number){const last=pack.days[Math.max(0,Math.min(tick,pack.days.length-1))];return list.filter(x=>x.d<=last)}
export const company=(pack:GamePack,code:string)=>pack.companies.find(c=>c.code===code);
// last F-score known on a day (reports disclosed on or before it)
export function fscoreOn(pack:GamePack,code:string,d:string){const s=(pack.fscore[code]??[]).filter(x=>x.disc<=d);return s.length?s[s.length-1]:null}
// headlines carry real names; the blind screen swaps each company name for its slot until the reveal
export function maskTitle(pack:GamePack,t:string){let s=t;for(const c of pack.companies)s=s.split(c.name).join('회사 '+c.slot);return s}
