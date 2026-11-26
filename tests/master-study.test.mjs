// 거장의 집 · 버핏의 서재 (core/master-study.ts)
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const M=await load('core/master-study');
const M_L=await load('content/master-books');
const {BOOKS,BOOK_QUIZZES}=M_L;

test('16 books, each a lesson with a quiz on the same revision (피드백 2026-11-26: lessons, not pages)', () => {
  const {LESSONS}=M_L;
  assert.equal(BOOKS.length,16);assert.equal(LESSONS.length,16);
  for (const b of BOOKS) {const q=M.quizOf(b.book_id);assert.ok(q);assert.equal(q.revision,b.revision);assert.equal(q.revision,3);
    for (const x of q.questions) {assert.equal(x.kind,'mc');assert.ok(x.answer>=0&&x.answer<4);assert.ok(x.why.length>10);assert.ok(x.sec>=0&&x.sec<b.sections.length);}}
  // every step says something; a step that asks to try a thing names a picture that can wait for it
  const WAITS=['grow','loss','quote','gap','sort','moat','story','flow','choose'];
  for (const l of LESSONS) {assert.ok(l.steps.length>=3);for (const st of l.steps) {assert.ok(st.say.length>5);if (st.t) assert.ok(WAITS.includes(st.w),l.no+':'+st.say.slice(0,10));}
    // no buy/sell advice or price calls in what Buffett says (CLAUDE.md)
    for (const st of l.steps) assert.doesNotMatch(st.say+(st.ok??''),/사세요|파세요|오를 거|떨어질 거|사라고|팔라고/);}
});

test('a quiz opens only for the same book_id and revision', () => {
  const b=BOOKS[0];
  assert.equal(M.quizOf(b.book_id,[{...BOOK_QUIZZES[0],revision:2}]),null);
  assert.equal(M.quizOf('nope'),null);
});

test('pages keep every paragraph once, titles with their first paragraph, and the reading spot across sizes', () => {
  const b=BOOKS[2],all=M.parasOf(b);
  for (const budget of [90,200,400,2000]) {const pages=M.paginate(b,budget),flat=pages.flat();
    assert.deepEqual([...new Set(flat.map(p=>p.i))],all.map(p=>p.i));
    const at=2,pg=M.pageOfPara(pages,at);assert.ok(pages[pg].some(p=>p.i===at));}
  assert.equal(M.paginate(b,2000).length,1);
});

test('the last page keeps room for the source line and the finish button', () => {
  const b=BOOKS[2],len=pg=>pg.reduce((n,x)=>n+x.text.length+(x.head?24:0),0);
  for (const budget of [200,400,600]) {const end=90,pages=M.paginate(b,budget,end),last=pages.at(-1);
    assert.ok(last.length===1||len(last)+end<=budget);
    assert.deepEqual(pages.flat().map(p=>p.i+(p.cont?'c':'')),M.paginate(b,budget).flat().map(p=>p.i+(p.cont?'c':'')));}
});

test('reading spot is saved; only the last page button finishes a book', () => {
  let s=M.STUDY0;s=M.putRead(s,'01',3);assert.equal(M.readState(s,'01'),'reading');
  s=M.finishRead(s,'01',5);assert.equal(M.readState(s,'01'),'done');assert.equal(s.nod,'01');
  s=M.finishRead(s,'05',5);assert.deepEqual(M.booksRead(s).map(b=>b.book_id),['05','01']);
});

test('a quiz goes one by one, comes back to the explanation after a leave, and finishes right or wrong', () => {
  const id='02',q=M.quizOf(id),n=q.questions.length;let s=M.finishRead(M.STUDY0,id,5);
  assert.equal(M.quizStatus(s,id).kind,'new');
  s=M.startQuiz(s,id,q.revision);s=M.submit(s,id,n,3);
  assert.deepEqual(M.quizAt(s.quiz[id],n),{i:0,explain:true,result:false});
  assert.equal(M.offerLabel(BOOKS[1],M.quizStatus(s,id)),`퀴즈 이어 풀기 · 1/${n}`);
  s=M.startQuiz(s,id,q.revision);assert.equal(s.quiz[id].answers.length,1);// goes on
  s=M.seeNext(s,id);assert.deepEqual(M.quizAt(s.quiz[id],n),{i:1,explain:false,result:false});
  for (let k=1;k<n;k++) {s=M.submit(s,id,n,3);s=M.seeNext(s,id);}
  assert.ok(s.quiz[id].finished);assert.equal(M.quizAt(s.quiz[id],n).result,true);
  assert.equal(M.rightCount(q.questions,s.quiz[id]),0);
  s=M.markPaid(s,id);assert.equal(M.quizStatus(s,id).paid,true);
  // a review starts fresh and keeps the payment
  s=M.startQuiz(s,id,q.revision);assert.equal(s.quiz[id].answers.length,0);assert.equal(s.quiz[id].paid,true);
});

test('words are checked without spaces round them', () => {
  const q={kind:'word',q:'',answer:'복리',why:'',sec:0};
  assert.ok(M.isRight(q,' 복리 '));assert.ok(!M.isRight(q,'복'));
});

test('Buffett offers a run left half way first, then the newest unread quiz', () => {
  let s=M.finishRead(M.STUDY0,'01',1);s=M.finishRead(s,'02',1);
  assert.equal(M.firstOffer(s).book_id,'02');
  s=M.startQuiz(s,'01',3);s=M.submit(s,'01',3,0);
  assert.equal(M.firstOffer(s).book_id,'01');
  assert.equal(M.firstOffer(M.STUDY0),null);
});
