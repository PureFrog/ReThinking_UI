// 투자학습 퀴즈 100문항 (core/quiz100.ts, content/quiz100.json): the file reads, every answer grades right against
// itself, near misses grade wrong, and the day's bundle is dealt from these papers.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const Q=await load('core/quiz100');
const D=await load('core/desk');

// the answer as the screen would send it (fill_blank as typed text)
const asSent=q=>q.type==='fill_blank'?Object.fromEntries(Object.entries(q.answer).map(([k,v])=>[k,Array.isArray(v)?v[0]:String(v)])):q.answer;

test('100 questions, ids unique, eight kinds, each answerable on screen', () => {
  assert.equal(Q.QUIZ100.length,100);assert.equal(new Set(Q.QUIZ100.map(q=>q.id)).size,100);
  assert.equal(new Set(Q.QUIZ100.map(q=>q.type)).size,8);
  for(const q of Q.QUIZ100){assert.ok(Q.KIND_LABEL[q.type],q.id);assert.ok(q.explanation.length>5,q.id);
    const r=asSent(q);assert.ok(Q.ready(q,r),q.id+' ready');assert.ok(Q.grade(q,r),q.id+' grades right');
    assert.ok(Q.say(q,q.answer).every(l=>l&&!l.includes('undefined')),q.id)}
});
test('near misses are wrong; nothing sent is wrong', () => {
  for(const q of Q.QUIZ100){assert.equal(Q.grade(q,null),false);const a=q.answer;
    if(q.type==='ordering')assert.equal(Q.grade(q,[...a].reverse()),false,q.id);
    if(q.type==='multiple_select')assert.equal(Q.grade(q,a.slice(1)),a.length===0,q.id);
    if(q.type==='true_false')assert.equal(Q.grade(q,a==='true'?'false':'true'),false);
    if(q.type==='direction'){const k=Object.keys(a)[0];assert.equal(Q.grade(q,{...a,[k]:a[k]==='up'?'down':'up'}),false,q.id)}}
});
test('fill-in: numbers by value (commas, units and a plus sign allowed), words without spaces', () => {
  const n=Q.QUIZ100.find(q=>q.type==='fill_blank'&&typeof q.answer.b1==='number');const v=n.answer.b1;
  assert.ok(Q.grade(n,{b1:String(v)}));assert.ok(Q.grade(n,{b1:v+'%'}));assert.ok(Q.grade(n,{b1:` ${v}.0 `}));assert.equal(Q.grade(n,{b1:String(v+1)}),false);assert.equal(Q.grade(n,{b1:''}),false);
  const t=Q.QUIZ100.find(q=>q.type==='fill_blank'&&Array.isArray(q.answer.b1)&&q.answer.b1.includes('ETF'));
  assert.ok(Q.grade(t,{b1:'ETF'}));assert.ok(Q.grade(t,{b1:'상장 지수 펀드'}));assert.equal(Q.grade(t,{b1:'채권'}),false);
  assert.ok(!t.prompt.includes('[빈칸]'),'the blank is shown as a line');
});
test('입문 set is the deck (Q101~Q200); the first set still found by id for 지난 퀴즈', () => {
  assert.ok(Q.QUIZ100.every(q=>/^Q(1\d\d|200)$/.test(q.id)));
  assert.equal(Q.quizById('Q001')?.id,'Q001');assert.equal(Q.quizById('Q150')?.id,'Q150');assert.equal(Q.quizById('Q999'),undefined);
});
test('the day is dealt from the 100 papers; a stamp keeps the response and grades it', () => {
  const ps=D.quizPapers();assert.equal(ps.length,100);
  const ids=D.bundleOfDay(ps,'2026-11-21');assert.equal(ids.length,D.DESK.perDay);assert.ok(ids.every(id=>id.startsWith('q100:')));
  const P=id=>ps.find(p=>p.id===id);let d=D.newDay('2026-11-21',ids);
  d=D.stampPaper(d,P(ids[0]),0,asSent(P(ids[0]).quiz));assert.equal(d.stamps[0].right,true);assert.deepEqual(d.stamps[0].resp,asSent(P(ids[0]).quiz));
  d=D.stampPaper(d,P(ids[1]),null,null);assert.equal(d.stamps[1].right,false);assert.equal(d.stamps[1].choice,null);
});
