// 지기 J2 (docs/jigi.md 2.4): a confirmed hypothesis that will be graded goes under its tree as a capsule, and comes up
// when its verdict is in. One marker per tree: a verdict not yet opened first (oldest end date first), otherwise the
// nearest end date still to come (D-n). Hypotheses with no tree (a stock not in the garden) keep no capsule.
import {verdict} from './hypothesis';
import {live,type Journal} from './journal';

export type HypoCapsule={holdingId:number;journalId:string;hypoId:string;endDate:string;due:boolean;inDays:number;count:number};
const days=(a:string,b:string)=>Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/864e5);
export function hypoCapsules(journals:Journal[],today:string,holdingIds:number[]):HypoCapsule[]{
  const ids=new Set(holdingIds),per=new Map<number,HypoCapsule[]>();
  for(const j of live(journals)){if(j.holdingId==null||!ids.has(j.holdingId)||j.status!=='saved')continue;
    for(const h of j.hypos){if(h.status!=='confirmed'||!h.auto||h.opened)continue;const v=verdict(j,h,today).s;
      if(v!=='wait'&&v!=='hit'&&v!=='fail'&&v!=='void')continue;
      const a=per.get(j.holdingId)??[];a.push({holdingId:j.holdingId,journalId:j.id,hypoId:h.id,endDate:h.endDate,due:v!=='wait',inDays:Math.max(0,days(today,h.endDate)),count:1});per.set(j.holdingId,a)}}
  return [...per.values()].map(a=>{const due=a.filter(c=>c.due).sort((x,y)=>x.endDate.localeCompare(y.endDate)),wait=a.filter(c=>!c.due).sort((x,y)=>x.inDays-y.inDays);
    const top=due[0]??wait[0];return {...top,count:a.filter(c=>c.due===top.due&&c.endDate===top.endDate).length}});
}
export const hypoCapsuleLabel=(c:HypoCapsule)=>(c.due?'판정 완료':`D-${c.inDays}`)+(c.count>1?` · ${c.count}개`:'');
