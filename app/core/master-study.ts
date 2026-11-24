// 거장의 집 · 버핏의 서재 (buffett_house_ui.md, 2026-11-24): what the study remembers and its rules, apart from the 3D.
// - reading: each book keeps the paragraph it was opened at (para, counted through all its sections), so a new window
//   size cuts new pages and still opens on the same text; 'done' is set only by "다 읽고 덮기" on the last page
// - quiz: one per book, found by book_id AND revision (never by number, shelf slot or title); answers are kept as they
//   are submitted, 'seen' counts the explanations moved past (a leave right after a submit comes back to that one)
// - coins: the first time a book's quiz is finished, right or wrong (the grant tag stops a second payment)
import {BOOKS,BOOK_QUIZZES,type Book,type BookQuestion,type BookQuiz} from '../content/master-books';

export type BookRead={para:number;done?:boolean;doneAt?:number};
export type QuizRun={rev:number;answers:(number|string)[];seen:number;finished?:boolean/* this run */;ever?:boolean/* finished once */;paid?:boolean};
export type StudySave={v:1;hint?:boolean;seq:number;read:Record<string,BookRead>;quiz:Record<string,QuizRun>;nod?:string|null};
export const STUDY0:StudySave={v:1,seq:0,read:{},quiz:{}};
export function readStudy(x:unknown):StudySave{const o=x as Partial<StudySave>|null;
  if(!o||o.v!==1||typeof o.read!=='object'||typeof o.quiz!=='object')return STUDY0;
  return {v:1,hint:!!o.hint,seq:Number(o.seq)||0,read:o.read??{},quiz:o.quiz??{},nod:o.nod??null}}

export const bookOf=(id:string):Book|undefined=>BOOKS.find(b=>b.book_id===id);
export function quizOf(id:string,quizzes:BookQuiz[]=BOOK_QUIZZES,books:Book[]=BOOKS):BookQuiz|null{
  const b=books.find(x=>x.book_id===id);if(!b)return null;
  return quizzes.find(q=>q.book_id===id&&q.revision===b.revision)??null}

// ---- pages: a book's paragraphs, cut to a budget of characters per page; a section's title goes with its first
// paragraph, a paragraph is never split (a long one gets a page of its own)
export type Para={sec:number;i:number/* through the book */;text:string;head?:string;cont?:boolean/* goes on from the page before */};
export const parasOf=(b:Book):Para[]=>{let i=0;const out:Para[]=[];
  b.sections.forEach((s,sec)=>s.paras.forEach((text,k)=>out.push({sec,i:i++,text,...(k===0?{head:s.title}:{})})));return out};
const HEAD=24;
// a paragraph that does not fit what is left of a page is cut between sentences and goes on over the page (the team's
// paragraphs run long); one sentence longer than a page still gets a page of its own
export function paginate(b:Book,budget:number):Para[][]{const pages:Para[][]=[];let cur:Para[]=[],used=0;
  const put=(p:Para)=>{cur.push(p);used+=p.text.length+(p.head?HEAD:0)};
  const turn=()=>{if(cur.length){pages.push(cur);cur=[];used=0}};
  for(const p of parasOf(b)){const cost=p.text.length+(p.head?HEAD:0);
    if(used+cost<=budget){put(p);continue}
    const sents=p.text.match(/[^.?!]+[.?!]+["')\]]*\s*|[^.?!]+$/g)??[p.text];
    let piece:string[]=[],first=true;
    const out=(cont:boolean)=>{if(!piece.length)return;put({...p,text:piece.join('').trim(),...(first?{}:{head:undefined}),cont});piece=[];first=false};
    for(const s0 of sents){const room=budget-used-(first&&p.head?HEAD:0),len=piece.join('').length;
      if(len+s0.length>room&&(piece.length||cur.length)){out(!first);turn()}
      piece.push(s0)}
    out(!first)}
  turn();return pages}
export const pageOfPara=(pages:Para[][],para:number)=>{const i=pages.findIndex(pg=>pg.some(p=>p.i===para));return i<0?0:i};
export const pageOfSec=(pages:Para[][],sec:number)=>{const i=pages.findIndex(pg=>pg.some(p=>p.sec===sec));return i<0?0:i};
// characters a page holds at this size (the page's inner box and a ~15px Korean line)
export const pageBudget=(w:number,h:number)=>Math.max(90,Math.round((w/15.5)*(h/27)*0.9));

// ---- reading
export const putRead=(s:StudySave,id:string,para:number):StudySave=>({...s,read:{...s.read,[id]:{...s.read[id],para}}});
export function finishRead(s:StudySave,id:string,para:number):StudySave{const seq=s.seq+1,was=s.read[id];
  return {...s,seq,nod:id,read:{...s.read,[id]:{para,done:true,doneAt:was?.done?was.doneAt??seq:seq}}}}
export const readState=(s:StudySave,id:string):'new'|'reading'|'done'=>s.read[id]?.done?'done':s.read[id]&&s.read[id].para>0?'reading':'new';

// ---- quiz
export const norm=(x:string)=>x.trim().replace(/\s+/g,'');
export const isRight=(q:BookQuestion,a:number|string)=>q.kind==='mc'?a===q.answer:typeof a==='string'&&norm(a)===norm(q.answer);
export function startQuiz(s:StudySave,id:string,rev:number):StudySave{const was=s.quiz[id];
  // a run under way of the same revision goes on; a finished one (or one of an older text) starts again
  if(was&&was.rev===rev&&!was.finished)return s;
  return {...s,quiz:{...s.quiz,[id]:{rev,answers:[],seen:0,ever:was?.rev===rev?was.ever:false,paid:was?.paid}}}}
export function submit(s:StudySave,id:string,n:number,a:number|string):StudySave{const r=s.quiz[id];if(!r||r.finished||r.answers.length>=n)return s;
  const answers=[...r.answers,a],finished=answers.length>=n;
  return {...s,quiz:{...s.quiz,[id]:{...r,answers,finished,ever:r.ever||finished}}}}
export const seeNext=(s:StudySave,id:string):StudySave=>{const r=s.quiz[id];if(!r)return s;
  return {...s,quiz:{...s.quiz,[id]:{...r,seen:Math.min(r.answers.length,r.seen+1)}}}};
export const markPaid=(s:StudySave,id:string):StudySave=>{const r=s.quiz[id];return r?{...s,quiz:{...s.quiz,[id]:{...r,paid:true}}}:s};
// where a run stands: the question on the panel, and whether its explanation is up
export function quizAt(r:QuizRun|undefined,n:number):{i:number;explain:boolean;result:boolean}{
  if(!r)return {i:0,explain:false,result:false};
  if(r.seen<r.answers.length)return {i:r.answers.length-1,explain:true,result:false};
  if(r.finished||r.answers.length>=n)return {i:n-1,explain:false,result:true};
  return {i:r.answers.length,explain:false,result:false}}
export const rightCount=(qs:BookQuestion[],r:QuizRun)=>r.answers.filter((a,i)=>qs[i]&&isRight(qs[i],a)).length;

// ---- what Buffett offers: the books read, newest first, each with its quiz's state
export type QuizStatus={kind:'none'|'new'|'progress'|'done'|'missing';k:number;n:number;paid:boolean};
export function quizStatus(s:StudySave,id:string):QuizStatus{const q=quizOf(id);if(!q)return {kind:'missing',k:0,n:0,paid:false};
  const r=s.quiz[id],n=q.questions.length;
  if(!r||r.rev!==q.revision)return {kind:'new',k:0,n,paid:false};
  if(!r.finished&&r.answers.length>0)return {kind:'progress',k:r.answers.length,n,paid:!!r.paid};
  if(r.ever)return {kind:'done',k:n,n,paid:!!r.paid};
  return {kind:'new',k:0,n,paid:false}}
export const booksRead=(s:StudySave)=>BOOKS.filter(b=>s.read[b.book_id]?.done).sort((a,b)=>(s.read[b.book_id].doneAt??0)-(s.read[a.book_id].doneAt??0));
// the first offer: a run left half way, else the newest book whose quiz is not done, else the newest book
export function firstOffer(s:StudySave):Book|null{const read=booksRead(s);if(!read.length)return null;
  return read.find(b=>quizStatus(s,b.book_id).kind==='progress')??read.find(b=>quizStatus(s,b.book_id).kind==='new')??read[0]}
export function offerLabel(b:Book,st:QuizStatus){
  if(st.kind==='missing')return `제 ${b.no}권 · 퀴즈를 불러올 수 없어요`;
  if(st.kind==='progress')return `퀴즈 이어 풀기 · ${st.k}/${st.n}`;
  if(st.kind==='done')return st.paid?`제 ${b.no}권 · 완료 · 코인 수령`:`제 ${b.no}권 · 완료`;
  return `제 ${b.no}권 퀴즈 풀기`}
