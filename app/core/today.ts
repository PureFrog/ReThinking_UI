// Today's three (a game day with a start and an end): what to do on opening the garden, ticked off as it happens.
// 1. a judgment on one of today's signals (or a 되감기 round when nothing was flagged)
// 2. today's case
// 3. the grades that arrived (or a 되감기 round when none did)
// Finishing all three closes the day once (a small bonus, core/ledger.ts EARN.dayDone). Also: when the next grade is
// due, the reason to come back (the in-app line now; a push from the app shell or server later, docs/server.md).
import {MARKS,shiftDay,daysBetween,type Judgment,type Graded,type Mark} from './judgment';
// 퀘스트 게시판 (게임 구성 2026-11-20): the day's three are the day of the game itself: the quiz at the desk, one
// journal on a real stock, and one cast at the pond. All three done closes the day (core/ledger.ts EARN.dayDone).
export type TaskId='quiz'|'judge'|'fish';
export type TodayTask={id:TaskId;done:boolean};
export type TodayInput={quizDone:boolean;judgedToday:number;fishedToday:number};
export function todayTasks(i:TodayInput):TodayTask[]{
  return [{id:'quiz',done:i.quizDone},{id:'judge',done:i.judgedToday>0},{id:'fish',done:i.fishedToday>0}];
}
export const dayDone=(tasks:TodayTask[])=>tasks.every(t=>t.done);
// the nearest grade still to come (not today's): which judgment, which mark, how many days
export function nextGrade(list:Judgment[],graded:Graded[],today:string):{name:string;mark:Mark;day:string;inDays:number}|null{
  const done=new Set(graded.map(g=>g.judgmentId+'@'+g.mark));let best:{name:string;mark:Mark;day:string;inDays:number}|null=null;
  for(const j of list)for(const m of MARKS){if(done.has(j.id+'@'+m))continue;const day=shiftDay(j.day,m),d=daysBetween(today,day);
    if(d>0&&(!best||d<best.inDays))best={name:j.name,mark:m,day,inDays:d}}
  return best;
}
