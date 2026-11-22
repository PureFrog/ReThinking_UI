// 오늘의 퀴즈: 서류와 도장 (설계 9-2, 9-4). 보리 pushes a bundle of papers over the desk, one at a time; the player reads
// each and stamps one of two rubber stamps (맞다 / 아니다), or the clock runs out (시간 초과). Each stamp is kept at once,
// so a visit that leaves halfway goes on from the next paper. The day's experience and the unlock are counted once,
// when the last paper of the bundle is stamped (finishDay). Pure: the screen keeps the save.
import {BOOKS} from './quiz-books';
import {QUIZ100,TOPIC_LABEL,grade,type Q100,type Resp} from './quiz100';

// the numbers in one place: the unlock check and the lock plate read the same values (9-4)
// 2026-11-20: 5 papers a day (the doc's 8 cut so a first-time player doesn't tire); with 4 of 5 right a day is 6 xp,
// so Lv.5 (24 xp) comes in about four days, as 9-4 planned
export const DESK={perDay:5,xpRight:1,xpDone:2,perLevel:6,unlockLevel:5};
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
export type DeskDay={day:string;ids:string[];stamps:Stamp[];done:boolean;xp:number};
export const newDay=(day:string,ids:string[]):DeskDay=>({day,ids,stamps:[],done:false,xp:0});
export const nextPaper=(d:DeskDay)=>d.done?null:d.ids[d.stamps.length]??null;
// one stamp on the paper on top (a second stamp on the same paper changes nothing)
// (a 100-question paper: resp is the response, null when the clock ran out; it is graded by its kind)
export function stampPaper(d:DeskDay,p:Paper,choice:0|1|null,resp?:Resp|null):DeskDay{
  if(nextPaper(d)!==p.id)return d;
  if(p.quiz){const r=choice===null?null:resp??null;return {...d,stamps:[...d.stamps,{id:p.id,choice:r===null?null:0,right:grade(p.quiz,r),...(r===null?{}:{resp:r})}]}}
  return {...d,stamps:[...d.stamps,{id:p.id,choice,right:choice!==null&&choice===p.answer}]};
}
// the bundle closed: experience once (a right paper 1, the whole bundle 2)
export function finishDay(d:DeskDay):DeskDay{
  if(d.done||d.stamps.length<d.ids.length)return d;
  return {...d,done:true,xp:d.stamps.filter(s=>s.right).length*DESK.xpRight+DESK.xpDone};
}
export const levelOf=(xp:number)=>({lv:1+Math.floor(xp/DESK.perLevel),xp,toNext:DESK.perLevel-xp%DESK.perLevel});
// the lowest experience that reaches a level (for a lent level: ?quizlv=N)
export const xpFor=(lv:number)=>Math.max(0,(lv-1)*DESK.perLevel);

// where the stamp lands and how crooked: fixed per paper, so the same mark shows when it is opened again
export function stampMark(id:string){const h=hash('mark:'+id);return {x:-14+(h%29),y:-6+((h>>5)%13),rot:-11+((h>>9)%23)}}
