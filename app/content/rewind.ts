// The cases for 되감기 (core/rewind.ts). Today these are MADE-UP companies with made-up numbers, shown as such
// ("연습 · 가상 회사"): no real company's prices are invented. Each round is built from its number, so a player meets
// the same sequence on every device. The analyst's note comes from the same maker as the garden's (signals.ts
// madeSignal). The models are right a bit more often than not, as a real model would be; the server (R5) swaps
// rewindProvider for the team's real past cases (a real note and the real 30-day move) without touching the screen.
import {madeSignal,type Signal} from './signals';
import type {Holding} from '../core/model';
export type RewindCase={id:string;name:string;sector:string;held:string;rate:number;sig:Signal;after:number;loss:boolean};
const POOL:[string,string][]=[['한결물산','유통'],['도담전자','전자부품'],['새벽해운','해운'],['누리바이오','바이오'],['가온건설','건설'],['다솜식품','식품'],
  ['미르소재','화학'],['별빛게임즈','게임'],['온새미로텍','소프트웨어'],['하람제약','제약'],['모래내철강','철강'],['바람길항공','항공']];
const HELD=['3개월째','5개월째','반년째','8개월째','1년째','1년 반째'];
function rng(seed:number){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
// how often the model's call holds up in these practice cases (a drop of 5% or more after a loss signal)
export const MODEL_RIGHT=0.6;
export function rewindCase(n:number):RewindCase{
  const r=rng(n*7919+17),[name,sector]=POOL[n%POOL.length];
  // mostly losses (that is what the models flag); now and then a gain whose source the auditor doubts
  const band=r();let rate=band<0.3?-(20+Math.round(r()*25)):band<0.8?-(8+Math.round(r()*11)):12+Math.round(r()*14);
  const h:Holding={id:900000+n,name,kind:0,price:0,quantity:1,date:'',rate,plot:-1,lossDays:0};
  let made=madeSignal(h);
  if(!made){rate=-(8+Math.round(r()*11));made=madeSignal({...h,rate})!}
  const sig:Signal={...made,id:`rewind:${n}`},right=r()<MODEL_RIGHT;
  // the 30 days after: when the model was right, a real drop; otherwise anything from a small dip to a rebound
  const after=Math.round((right?-(5+r()*22):-4+r()*20)*10)/10;
  return {id:`rewind-${n}`,name,sector,held:HELD[Math.floor(r()*HELD.length)],rate,sig,after,loss:sig.loss};
}
export type RewindProvider={round(n:number):RewindCase};
export const rewindProvider:RewindProvider={round:rewindCase};
