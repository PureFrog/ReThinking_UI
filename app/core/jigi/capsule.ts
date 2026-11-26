// where a journal's time capsule stands, and its stars (ui/JigiFun.tsx shows them; 피드백 C)
//   sealed till its hypotheses' end date (D-n), arrived (a verdict is in and not yet looked back on), opened (looked
//   back on), or just a record (nothing to grade). Stars: the share of graded hypotheses that came true (all 3, half or
//   more 2, any 1, none 0). The verdicts are core/jigi/hypothesis.ts verdict: nothing new is graded here.
import {verdict} from './hypothesis';
import type {Journal} from './journal';
const DAY=864e5;
export type Capsule={k:'sealed';days:number;end:string}|{k:'arrived'}|{k:'opened'}|{k:'record'};
export function capsuleOf(j:Journal,today:string):Capsule{
  if(j.status!=='saved')return {k:'record'};
  const vs=j.hypos.map(h=>({h,v:verdict(j,h,today)}));
  if(vs.some(x=>x.v.s==='hit'||x.v.s==='fail'))return j.reflection?{k:'opened'}:{k:'arrived'};
  const wait=vs.filter(x=>x.v.s==='wait').map(x=>x.h.endDate).sort();
  if(wait.length){const end=wait[0],days=Math.max(0,Math.ceil((Date.parse(end+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/DAY));return {k:'sealed',days,end}}
  return {k:'record'};
}
// stars for the share of graded hypotheses that came true: all 3, half or more 2, any 1, none 0
export function starsOf(j:Journal,today:string){const vs=j.hypos.map(h=>verdict(j,h,today).s),hit=vs.filter(s=>s==='hit').length,n=hit+vs.filter(s=>s==='fail').length;
  return {hit,n,stars:!n?0:hit===n?3:hit*2>=n?2:hit>0?1:0}}

