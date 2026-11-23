// What a stock did after a judgment, for grading (app/core/judgment.ts). A stock on real prices (a holding put in from
// the KRX names, price_daily) is graded on its real closes: from the last close on or before the judgment day to the
// last close on or before the mark day, once a close on or after the mark day is in (until then the grade waits).
// Everything else (the demo garden, typed-in mock stocks) keeps the mock: a fixed drift per demo holding (so the
// flagged ones mostly kept falling, and one flag turns out wrong) plus a small steady wobble, or a made-up drift from a
// hash of the holding id. The grading rules do not change.
import {shiftDay,type Judgment,type Mark} from '../core/judgment';
import type {Holding} from '../core/model';
import {bars,isReal,type Bar} from '../core/jigi/stocks';
const DRIFT:Record<number,[number,number]>={1:[6,11],2:[2,4],3:[-8,-17],4:[-6,-12],5:[3,-4],6:[1,-3],7:[-11,-24]};
const hash=(s:string)=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h};
export function mockAfter(holdingId:number,fromDay:string,mark:Mark){
  const [a,b]=DRIFT[holdingId]??[hash('d'+holdingId)%17-9,hash('e'+holdingId)%25-14],base=mark===30?a:b,wobble=(hash(holdingId+fromDay+mark)%41-20)/10;
  return Math.round((base+wobble)*10)/10;
}
// the move (%, one decimal) on real closes, or null while the mark day's close is not in yet
export function realAfter(bs:readonly Bar[],fromDay:string,mark:Mark):number|null{
  const target=shiftDay(fromDay,mark);
  if(!bs.length||bs[bs.length-1].d<target)return null;
  let base:Bar|null=null,end:Bar|null=null;
  for(const b of bs){if(b.d<=fromDay)base=b;if(b.d<=target)end=b}
  if(!base||!end||!base.c)return null;
  return Math.round((end.c/base.c-1)*1000)/10;
}
type Graded={holdingId:number;day:string;code?:string;real?:boolean};
// the judgment's own stock first (it may have left the garden since), else the holding as it is now
export function outcomeFor(j:Graded,mark:Mark,h?:Holding):number|null{
  const code=j.code??h?.code,real=j.real??(!!h?.real&&!h?.virtual);
  if(real&&code)return isReal(code)?realAfter(bars(code),j.day,mark):null;
  return mockAfter(j.holdingId,j.day,mark);
}
export type OutcomeProvider={after(j:Pick<Judgment,'holdingId'|'day'|'code'|'real'>,mark:Mark,h?:Holding):number|null};
export const outcomeProvider:OutcomeProvider={after:outcomeFor};
