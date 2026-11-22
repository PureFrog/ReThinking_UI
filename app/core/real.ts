// A garden on real prices (private test, 2026-11-17): a holding typed in with its stock code, buying day and quantity
// takes its buying price from that day's real close; afterwards its return and how long it has been under water come
// from the latest real close (app/core/jigi/stocks.ts keeps the bars, loaded from Supabase price_daily). Only the
// portfolio is made up; prices are real. Moa's notes on these trees use only what the bars show: no made-up numbers.
import type {Holding} from './model';
import type {Bar} from './jigi/stocks';

const DAY=864e5;
const round1=(x:number)=>Math.round(x*10)/10;
// the close a holding was bought at: the last trading day on or before the buying day
export function buyClose(bars:Bar[],day:string):Bar|null{for(let i=bars.length-1;i>=0;i--)if(bars[i].d<=day)return bars[i];return null}

// return and loss days from the latest bar. lossDays: calendar days since the close last stood at or above the buying
// price (0 when it does now); how long a loss has lasted drives the tree's wilting (core/model.ts conditionOf)
export function refreshed(h:Holding,bars:Bar[]):Holding{
  if(!h.real||!bars.length||!(h.price>0))return h;
  const last=bars[bars.length-1],rate=round1((last.c/h.price-1)*100);
  let lossDays=0;
  if(last.c<h.price){let since=h.date;for(let i=bars.length-1;i>=0;i--){if(bars[i].d<h.date)break;if(bars[i].c>=h.price){since=bars[i].d;break}}
    lossDays=Math.max(0,Math.round((Date.parse(last.d)-Date.parse(since))/DAY))}
  return rate===h.rate&&lossDays===h.lossDays&&h.asOf===last.d?h:{...h,rate,lossDays,asOf:last.d};
}

// what moa reads off the bars (only real numbers): the day's move against the 20-day volume, how long the close has
// been under its 20-day average, the fall from the highest close since buying
export type PriceRead={dayMove:number;volX:number|null;below20:number;fromHigh:number;rate:number;asOf:string};
export function readBars(h:Holding,bars:Bar[]):PriceRead|null{
  if(bars.length<21||!(h.price>0))return null;
  const n=bars.length,last=bars[n-1],prev=bars[n-2];
  const vols=bars.slice(n-21,n-1).map(b=>b.v??0),avgV=vols.reduce((a,b)=>a+b,0)/vols.length;
  let below20=0;for(let i=n-1;i>=20;i--){const ma=bars.slice(i-19,i+1).reduce((a,b)=>a+b.c,0)/20;if(bars[i].c<ma)below20++;else break}
  const since=bars.filter(b=>b.d>=h.date),high=Math.max(...(since.length?since:[last]).map(b=>b.c));
  return {dayMove:round1((last.c/prev.c-1)*100),volX:avgV>0&&last.v!=null?round1(last.v/avgV):null,below20,fromHigh:round1((last.c/high-1)*100),rate:round1((last.c/h.price-1)*100),asOf:last.d};
}
// which note, if any: a crash (a fall of 5% or more on 2x volume), else a slow slide (in loss, 10+ days under the
// 20-day line); nothing otherwise. Tori's notes need the financial statements, which are not connected yet.
export function priceFlag(r:PriceRead):'crash'|'gradual'|null{
  if(r.dayMove<=-5&&(r.volX??0)>=2)return 'crash';
  if(r.rate<=-8&&r.below20>=10)return 'gradual';
  return null;
}
export const fmtPct=(x:number)=>`${x>0?'+':''}${x}%`;
