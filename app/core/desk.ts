// 오늘의 퀴즈: 서류와 도장 (설계 9-2, 9-4). 보리 pushes a bundle of papers over the desk, one at a time; the player reads
// each and stamps one of two rubber stamps (맞다 / 아니다), or the clock runs out (시간 초과). Each stamp is kept at once,
// so a visit that leaves halfway goes on from the next paper. The day's experience and the unlock are counted once,
// when the last paper of the bundle is stamped (finishDay). Pure: the screen keeps the save.
import {BOOKS} from './quiz-books';
import {QUIZ100,TOPIC_LABEL,grade,type Q100,type Resp} from './quiz100';

// the numbers in one place: the unlock check and the lock plate read the same values (9-4)
// 2026-11-20: 5 papers a day (the doc's 8 cut so a first-time player doesn't tire); with 4 of 5 right a day is 6 xp,
// so Lv.5 (24 xp) comes in about four days, as 9-4 planned
// 피드백 2026-11-23 "퀴즈 2개를 주고 다 맞히면 기본 코인, 무한 도전 시작, 한 문제씩 맞힐 때마다 코인, 틀리면 거기서 끝":
// a day starts with 2 papers; both right pays the base coins and opens the endless run, one paper at a time
export const DESK={perDay:2,xpRight:1,xpDone:2,perLevel:6,unlockLevel:5};
export const KO_COUNT=['영','한','두','세','네','다섯','여섯','일곱','여덟','아홉','열'];

export type Topic=string;
// a paper: the old two-stamp kind (options, answer), or one of the 100 questions (quiz: any of its eight kinds)
export type Paper={id:string;topic:Topic;q:string;options:[string,string];answer:0|1;why:string;quiz?:Q100};
const BOOK_TOPIC:Record<string,Topic>={statements:'재무제표',disclosure:'공시 읽기',loss:'판단의 습관',diversify:'시장과 위험'};
// the quiz books' questions as papers (ids from the book and the page, never renumbered)
export const bookPapers=():Paper[]=>BOOKS.flatMap(b=>b.questions.map((q,i)=>({id:`book:${b.id}:${i}`,topic:BOOK_TOPIC[b.id]??'판단의 습관',q:q.q,options:q.options,answer:q.answer,why:q.why})));

// 투자학습 퀴즈 100문항 (core/quiz100.ts) as papers: the day's quiz is dealt from these since 2026-11-21
export const quizPapers=():Paper[]=>QUIZ100.map(q=>({id:'q100:'+q.id,topic:TOPIC_LABEL[q.topic]??q.topic,q:q.prompt,options:['O','X'],answer:q.answer==='true'?0:1,why:q.explanation,quiz:q}));

const hash=(s:string)=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h};
// the day's order: each topic shuffled by the day, then dealt one topic at a time so the bundle is mixed
function deal(ps:Paper[],day:string):Paper[]{
  const by=new Map<string,Paper[]>();for(const p of ps){if(!by.has(p.topic))by.set(p.topic,[]);by.get(p.topic)!.push(p)}
  const piles=[...by.entries()].sort((a,b)=>hash(day+a[0])-hash(day+b[0])).map(([,l])=>l.sort((a,b)=>hash(day+a.id)-hash(day+b.id)));
  const out:Paper[]=[];for(let i=0;out.length<ps.length;i++)for(const l of piles)if(l[i])out.push(l[i]);return out;
}
// the bundle of a day: papers not seen yet first; once all are seen, seen ones come round again
export function bundleOfDay(papers:Paper[],day:string,seen:string[]=[],n=DESK.perDay):string[]{
  const fresh=deal(papers.filter(p=>!seen.includes(p.id)),day).slice(0,n);
  const more=fresh.length<n?deal(papers.filter(p=>!fresh.includes(p)),day).slice(0,n-fresh.length):[];
  return [...fresh,...more].map(p=>p.id);
}

export type Stamp={id:string;choice:0|1|null/* null: 시간 초과; 0 for an answered 100-question paper */;right:boolean;resp?:Resp/* what was given on a 100-question paper */};
export type DeskDay={day:string;ids:string[];stamps:Stamp[];done:boolean;xp:number;run?:boolean/* 도전: the first papers all right, a challenge open */;cashed?:boolean/* stopped and took the coins */;level?:Level/* the challenge level, fixed at the first */};
export const newDay=(day:string,ids:string[]):DeskDay=>({day,ids,stamps:[],done:false,xp:0});
export const nextPaper=(d:DeskDay)=>d.done?null:d.ids[d.stamps.length]??null;
// one stamp on the paper on top (a second stamp on the same paper changes nothing)
// (a 100-question paper: resp is the response, null when the clock ran out; it is graded by its kind)
export function stampPaper(d:DeskDay,p:Paper,choice:0|1|null,resp?:Resp|null):DeskDay{
  if(nextPaper(d)!==p.id)return d;
  if(p.quiz){const r=choice===null?null:resp??null;return {...d,stamps:[...d.stamps,{id:p.id,choice:r===null?null:0,right:grade(p.quiz,r),...(r===null?{}:{resp:r})}]}}
  return {...d,stamps:[...d.stamps,{id:p.id,choice,right:choice!==null&&choice===p.answer}]};
}
// 피드백 2026-11-24 "입장 퀴즈 2개 다 맞히면 500코인, 도전": the day's first 2 papers all right make 500 coins and open a
// challenge. A challenge stakes what is held now on 2 more papers: both right moves up to the next step's coins, one
// wrong loses it all. After each step: stop and take it, or challenge again. The first challenge picks 쉬움 or 어려움,
// fixed for the rest of that day's run (어려움: the harder papers, bigger steps). Each step is the final amount, not
// added up; the last step ends the run. (어려움's steps are a first guess: the user only set 쉬움's.)
export type Level='easy'|'hard';
export const CHALLENGE:Record<Level,number[]>={easy:[500,1000,2000,5000,10_000,30_000,100_000],hard:[500,2000,5000,15_000,50_000,150_000,500_000]};
export const LEVEL_KO:Record<Level,string>={easy:'쉬운',hard:'어려운'};
// which of the 100 questions a challenge deals (core/quiz100.ts difficulty)
export const LEVEL_DIFF:Record<Level,string>={easy:'basic',hard:'intermediate'};
const allRight=(d:DeskDay)=>d.stamps.length>0&&d.stamps.every(s=>s.right);
// the step held now: 0 the entry pair, 1 the first challenge… (−1: nothing held)
export function stepOf(d:DeskDay):number{
  if(!allRight(d)||d.stamps.length<DESK.perDay)return -1;
  return Math.floor((d.stamps.length-DESK.perDay)/2);
}
export const stepCoins=(d:DeskDay,step=stepOf(d))=>step<0?0:CHALLENGE[d.level??'easy'][step]??0;
// a stamp went down: a wrong paper ends the day (in a challenge at once; the entry pair is read to the end);
// a pair finished all right waits for the choice (run), or closes the day paid at the last step
export function finishDay(d:DeskDay):DeskDay{
  if(d.done)return d;
  const xp=()=>d.stamps.filter(s=>s.right).length*DESK.xpRight+DESK.xpDone;
  const wrong=d.stamps.some(s=>!s.right);
  if(wrong&&(d.stamps.length>DESK.perDay||d.stamps.length>=d.ids.length))return {...d,ids:d.ids.slice(0,d.stamps.length),done:true,xp:xp()};
  if(d.stamps.length<d.ids.length)return d;
  if(stepOf(d)>=CHALLENGE.easy.length-1)return {...d,done:true,cashed:true,run:true,xp:xp()};
  return d.run?d:{...d,run:true};
}
// waiting on the choice: a pair just finished all right, nothing on top
export const choosing=(d:DeskDay)=>!d.done&&!!d.run&&d.stamps.length===d.ids.length&&allRight(d);
// the papers for the next challenge: 2 of its level, not on the desk yet, unseen first
export function challengePapers(papers:Paper[],day:string,seen:string[],ids:string[],level:Level):string[]{
  const want=papers.filter(p=>p.quiz?.difficulty===LEVEL_DIFF[level]&&!ids.includes(p.id));
  const pool=want.length>=2?want:papers.filter(p=>!ids.includes(p.id));
  return bundleOfDay(pool,day+':'+ids.length,seen,2);
}
// challenge again: the level is kept from the first challenge of the day
export function challenge(d:DeskDay,level:Level,next:string[]):DeskDay{
  if(!choosing(d)||next.length<2)return d;
  return {...d,level:d.level??level,ids:[...d.ids,...next.slice(0,2)]};
}
// coins of the day: paid only once taken (stopped, or the last step reached)
export const quizCoins=(d:DeskDay)=>d.cashed?stepCoins(d):0;
// stop now and take the step held
export function stopRun(d:DeskDay):DeskDay{
  if(!choosing(d))return d;
  return {...d,done:true,cashed:true,xp:d.stamps.length*DESK.xpRight+DESK.xpDone};
}
export const levelOf=(xp:number)=>({lv:1+Math.floor(xp/DESK.perLevel),xp,toNext:DESK.perLevel-xp%DESK.perLevel});
// the lowest experience that reaches a level (for a lent level: ?quizlv=N)
export const xpFor=(lv:number)=>Math.max(0,(lv-1)*DESK.perLevel);

// where the stamp lands and how crooked: fixed per paper, so the same mark shows when it is opened again
export function stampMark(id:string){const h=hash('mark:'+id);return {x:-14+(h%29),y:-6+((h>>5)%13),rot:-11+((h>>9)%23)}}
