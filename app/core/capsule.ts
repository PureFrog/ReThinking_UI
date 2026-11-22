// W3 타임캡슐 (docs/brief-wow.md): a judgment is buried under its tree as a capsule (the choice, the confidence, the
// one-line reason) and dug up when its grade comes due. One marker per tree: a capsule whose grade has arrived
// (oldest first), otherwise the nearest one still to come, with how many days are left (D-n).
// Cooldown seeds (core/cooldown.ts) are pots above the ground; capsules are metal and glass under it.
import {MARKS,shiftDay,daysBetween,dueGrades,type Judgment,type Graded,type Mark} from './judgment';
export type Capsule={holdingId:number;judgmentId:string;mark:Mark;day:string;due:boolean;inDays:number};
export function capsulesOf(list:Judgment[],graded:Graded[],today:string,holdingIds:number[]):Capsule[]{
  const ids=new Set(holdingIds),done=new Set(graded.map(g=>g.judgmentId+'@'+g.mark)),out=new Map<number,Capsule>();
  // arrived first (dueGrades keeps the oldest judgment first)
  for(const d of dueGrades(list,graded,today)){const j=d.judgment;if(!ids.has(j.holdingId)||out.has(j.holdingId))continue;
    const day=shiftDay(j.day,d.mark);out.set(j.holdingId,{holdingId:j.holdingId,judgmentId:j.id,mark:d.mark,day,due:true,inDays:daysBetween(today,day)})}
  for(const j of list){if(!ids.has(j.holdingId))continue;
    for(const m of MARKS){if(done.has(j.id+'@'+m))continue;const day=shiftDay(j.day,m),n=daysBetween(today,day);if(n<=0)continue;
      const cur=out.get(j.holdingId);if(!cur||(!cur.due&&n<cur.inDays))out.set(j.holdingId,{holdingId:j.holdingId,judgmentId:j.id,mark:m,day,due:false,inDays:n});break}}
  return [...out.values()];
}
// the label on the marker
export const capsuleLabel=(c:Capsule)=>c.due?'채점 완료':`D-${c.inDays}`;
