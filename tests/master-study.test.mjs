// 거장의 집 · 버핏의 서재 (core/master-study.ts)
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const M=await load('core/master-study');
const {BOOKS,BOOK_QUIZZES}=await load('content/master-books');

test('16 books, each with a quiz on the same revision; book 1 is the team\'s text and quiz', () => {
  assert.equal(BOOKS.length,16);
  for (const b of BOOKS) {const q=M.quizOf(b.book_id);assert.ok(q);assert.equal(q.revision,b.revision);
    for (const x of q.questions) assert.ok(x.sec>=0&&x.sec<b.sections.length);}
  const b1=BOOKS[0],q1=M.quizOf('01');
  assert.equal(b1.title,'주식시장이 문을 닫아도 내가 가진 것은 무엇일까?');assert.ok(!b1.draft);
  assert.deepEqual(b1.sections.map(s=>s.title.slice(0,5)),['농장을 살','주식을 산','매일 가격']);
  assert.deepEqual(q1.questions.map(x=>x.kind),['mc','mc','mc','word','word','word']);
  assert.deepEqual(q1.questions.slice(0,3).map(x=>x.answer),[1,2,2]);
  assert.deepEqual(q1.questions.map(x=>x.sec),[0,1,2,1,2,2]);
  assert.ok(M.isRight(q1.questions[5],'미스터마켓'));assert.equal(q1.keywords.length,3);
  assert.deepEqual(M.quizOf('02').questions.map(x=>x.kind),['mc','mc','word','word']);
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
    const at=4,pg=M.pageOfPara(pages,at);assert.ok(pages[pg].some(p=>p.i===at));}
  assert.equal(M.paginate(b,2000).length,1);
  // the team's long paragraphs go on over the page by sentences: nothing lost, nothing twice, no page over budget
  const t=BOOKS[0],strip=x=>x.replace(/\s+/g,'');
  for (const budget of [250,370,600]) {const pages=M.paginate(t,budget);
    for (const p of M.parasOf(t)) assert.equal(strip(pages.flat().filter(x=>x.i===p.i).map(x=>x.text).join('')),strip(p.text));
    for (const pg of pages) if (pg.length>1) assert.ok(pg.reduce((n,x)=>n+x.text.length+(x.head?24:0),0)<=budget);}
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
  assert.equal(M.offerLabel(BOOKS[1],M.quizStatus(s,id)),'퀴즈 이어 풀기 · 1/4');
  s=M.startQuiz(s,id,q.revision);assert.equal(s.quiz[id].answers.length,1);// goes on
  s=M.seeNext(s,id);assert.deepEqual(M.quizAt(s.quiz[id],n),{i:1,explain:false,result:false});
  for (const a of [0,' 틀림 ','x']) {s=M.submit(s,id,n,a);s=M.seeNext(s,id);}
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
  s=M.startQuiz(s,'01',1);s=M.submit(s,'01',4,0);
  assert.equal(M.firstOffer(s).book_id,'01');
  assert.equal(M.firstOffer(M.STUDY0),null);
});
