// 한 달 편지 (the monthly letter, ported from the 2D app's idea): when a new month opens, the analysts send a page on
// the month before: how much I judged, how it came out, my best and my roughest call, what I got stamped for, and a
// line from each of them. All about the judging, never returns; amounts never appear.
import {CHOICE_LABEL,type Judgment,type Graded} from './judgment';
export type Call={name:string;choice:string;mark:number;after:number;points:number};
export type Letter={month:string;judged:number;graded:number;hits:number;hitRate:number|null;calibration:number|null;best:Call|null;roughest:Call|null;
  cases:number;rewinds:number;stamps:string[];sure:number/* judgments at confidence 4–5 */;kept:number/* luon's counter met with "그래도 유지" */;changed:number/* reasons rewritten after luon */};
export const monthOf=(day:string)=>day.slice(0,7);
export function prevMonth(month:string){const [y,m]=month.split('-').map(Number);const d=new Date(Date.UTC(y,m-2,1));return d.toISOString().slice(0,7)}
export function monthLabel(month:string){return `${Number(month.slice(5))}월`}
export function letterOf(month:string,list:Judgment[],graded:Graded[],c:{cases:{day:string}[];rewinds:{day:string}[];stamps:{id:string;day:string}[]},stampName:(id:string)=>string):Letter{
  const inM=(d:string)=>monthOf(d)===month,byId=new Map(list.map(j=>[j.id,j]));
  const js=list.filter(j=>inM(j.day)),gs=graded.filter(g=>inM(g.day)&&byId.has(g.judgmentId));
  const hits=gs.filter(g=>g.hit).length;
  // calibration as in core/judgment.ts trackOf: 1 - Brier, over this month's grades
  const brier=gs.reduce((a,g)=>{const p=0.5+(byId.get(g.judgmentId)!.confidence-1)*0.1;return a+(p-(g.hit?1:0))**2},0);
  const call=(g:Graded):Call=>{const j=byId.get(g.judgmentId)!;return {name:j.name,choice:CHOICE_LABEL[j.choice],mark:g.mark,after:g.after,points:g.points}};
  const sorted=[...gs].sort((a,b)=>b.points-a.points);
  return {month,judged:js.length,graded:gs.length,hits,hitRate:gs.length?Math.round(hits/gs.length*100):null,calibration:gs.length?Math.round((1-brier/gs.length)*100):null,
    best:sorted.length&&sorted[0].points>0?call(sorted[0]):null,roughest:sorted.length&&sorted[sorted.length-1].points<0?call(sorted[sorted.length-1]):null,
    cases:c.cases.filter(x=>inM(x.day)).length,rewinds:c.rewinds.filter(x=>inM(x.day)).length,stamps:c.stamps.filter(x=>inM(x.day)).map(x=>stampName(x.id)),
    sure:js.filter(j=>j.confidence>=4).length,kept:js.filter(j=>j.rebuttal==='kept').length,changed:js.filter(j=>j.rebuttal==='accepted').length};
}
// a letter is due when this month has opened and last month had anything in it and it has not been read
export function letterDue(today:string,read:string[],l:Letter){return !read.includes(l.month)&&l.month<monthOf(today)&&(l.judged+l.graded+l.cases+l.rewinds)>0}
