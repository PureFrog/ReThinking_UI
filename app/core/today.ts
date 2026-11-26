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
export const dayDone=(tasks:{done:boolean}[])=>tasks.every(t=>t.done);
// 피드백 2026-11-26 "오늘의 퀘스트는 매일 조금씩 변해야": three a day from three groups, picked by the date (the same all
// day, different the next): one to learn, one to practise judging, one bit of village life. Two days in a row never
// bring the same three. done: what the game says happened today (quizDone, a journal saved, a cast, and the day's
// 했다 list kept on the device: core/did.ts).
export type QuestId='quiz'|'news'|'master'|'judge'|'vbuy'|'chart'|'fish'|'pet'|'fire'|'arcade';
export const QUEST_GROUPS:QuestId[][]=[['quiz','news','master'],['judge','vbuy','chart'],['fish','pet','fire','arcade']];
const dayNo=(day:string)=>Math.floor(Date.parse(day+'T00:00:00Z')/86400000);
export function questsFor(day:string):QuestId[]{
  const n=dayNo(day);
  // each group turns at its own pace (1, 2 and 3 steps a day across 3, 3 and 4 choices), so the set changes every day
  return QUEST_GROUPS.map((g,i)=>g[((n*(i+1))%g.length+g.length)%g.length]);
}
export function todayQuests(day:string,done:(id:QuestId)=>boolean):{id:QuestId;done:boolean}[]{return questsFor(day).map(id=>({id,done:done(id)}))}
// the nearest grade still to come (not today's): which judgment, which mark, how many days
export function nextGrade(list:Judgment[],graded:Graded[],today:string):{name:string;mark:Mark;day:string;inDays:number}|null{
  const done=new Set(graded.map(g=>g.judgmentId+'@'+g.mark));let best:{name:string;mark:Mark;day:string;inDays:number}|null=null;
  for(const j of list)for(const m of MARKS){if(done.has(j.id+'@'+m))continue;const day=shiftDay(j.day,m),d=daysBetween(today,day);
    if(d>0&&(!best||d<best.inDays))best={name:j.name,mark:m,day,inDays:d}}
  return best;
}
export const QUEST_LABEL:Record<QuestId,string>={quiz:'오늘의 퀴즈 풀기',news:'통신기 뉴스 하나 읽기',master:'거장의 집 들르기',judge:'내 종목 일지 한 편 쓰기',
  vbuy:'연습 종목 1주 사 보기',chart:'통신기에서 종목 차트 보기',fish:'낚시 한 번 하기',pet:'동물 쓰다듬어 주기',fire:'모닥불에 앉아 쉬기',arcade:'오락실에서 한 판'};
