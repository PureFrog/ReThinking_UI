// 지기 J3 과정 점수 (docs/jigi.md, decided 2026-11-15): the league and the job titles count the work, not the hits —
// a journal saved, a hypothesis confirmed for grading, a review written after a verdict, a journal written while a
// study task is on. Hitting is never scored (the 지기 rule: a hit rate is not a ranking of skill). Demo and practice
// pages earn nothing. Old 30·90-day grades already earned stay as they were (core/league.ts, core/rank.ts).
import {live,type Journal} from './journal';
import {weekOf} from '../league';

export const WORK={saved:3/* a journal saved (its first version) */,confirmed:2/* a hypothesis confirmed for automatic grading, up to 3 a journal */,
  reviewed:3/* the review after a verdict */,practiced:2/* a journal saved while a study task is on */} as const;
export type Act={kind:keyof typeof WORK;at:number;points:number;journalId:string};
export type StudyTask={id:string;text:string;at:number;done?:boolean};
export function acts(journals:Journal[],tasks:StudyTask[]=[]):Act[]{
  const out:Act[]=[];
  for(const j of live(journals)){if(j.demo||j.practice||j.status!=='saved'||!j.versions.length)continue;const first=j.versions[0].at;
    out.push({kind:'saved',at:first,points:WORK.saved,journalId:j.id});
    j.hypos.filter(h=>h.status==='confirmed'&&h.auto&&h.confirmedAt).slice(0,3).forEach(h=>out.push({kind:'confirmed',at:h.confirmedAt!,points:WORK.confirmed,journalId:j.id}));
    if(j.reflection?.plan)out.push({kind:'reviewed',at:j.reflection.at,points:WORK.reviewed,journalId:j.id});
    if(tasks.some(t=>t.at<=first))out.push({kind:'practiced',at:first,points:WORK.practiced,journalId:j.id})}
  return out.sort((a,b)=>a.at-b.at);
}
const dayOf=(ms:number)=>new Date(ms).toISOString().slice(0,10);
// this week's process points (Monday to Sunday of `day`)
export const weekWork=(journals:Journal[],tasks:StudyTask[],day:string)=>{const w=weekOf(day);return acts(journals,tasks).filter(a=>weekOf(dayOf(a.at))===w).reduce((s,a)=>s+a.points,0)};
// how many acts so far (the job titles' experience, core/rank.ts xpOf work)
export const workCount=(journals:Journal[],tasks:StudyTask[]=[])=>acts(journals,tasks).length;
