// recall: what an analyst remembers about the player (redesign 2장 "버릇을 기억하고 짚어"): the latest judgment the player made
// on one of that analyst's signals, and how it came out. The lines that say it are in content/analysts.ts LINES.remember.
import {daysBetween,shiftDay,MARKS,CHOICE_LABEL,type Judgment,type Graded} from './judgment';
export type Recall={kind:'hit'|'miss';name:string;choice:string;mark:number}|{kind:'waiting';name:string;choice:string;days:number};
// holdingId: only memories about this company (a briefing on it); otherwise the latest of any
export function recallOf(analyst:string,list:Judgment[],graded:Graded[],today:string,holdingId?:number):Recall|null{
  const mine=list.filter(j=>j.analyst===analyst&&j.day<today&&(holdingId===undefined||j.holdingId===holdingId)).sort((a,b)=>b.day.localeCompare(a.day));
  const j=mine[0];if(!j)return null;
  const gs=graded.filter(g=>g.judgmentId===j.id).sort((a,b)=>b.mark-a.mark),g=gs[0];
  if(g)return {kind:g.hit?'hit':'miss',name:j.name,choice:CHOICE_LABEL[j.choice],mark:g.mark};
  const m=MARKS.find(m=>daysBetween(today,shiftDay(j.day,m))>0);
  return m?{kind:'waiting',name:j.name,choice:CHOICE_LABEL[j.choice],days:daysBetween(today,shiftDay(j.day,m))}:null;
}
