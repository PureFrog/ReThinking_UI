// 집과 마을 (core/house.ts, core/casefile.ts): quiz level and the Lv.5 unlock, the desk's six states, the case file
// decision (judgment and order together, no future papers) and its grading.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load} from './load-app.mjs';
const H=await load('core/house');
const C=await load('core/casefile');
const P=await load('core/game/play');

test('the Korean date, whatever the device clock', () => {
  assert.equal(H.kstDay(Date.parse('2026-11-19T15:30:00Z')),'2026-11-20');
  assert.equal(H.kstDay(Date.parse('2026-11-19T14:59:00Z')),'2026-11-19');
});
const D=await load('core/desk');
const {DESK_PAPERS}=await load('content/desk-papers');
const ALL=[...D.bookPapers(),...DESK_PAPERS];
test('56 papers, ids unique, two stamps each, no advice or price calls', () => {
  assert.equal(ALL.length,56);assert.equal(new Set(ALL.map(p=>p.id)).size,ALL.length);
  for(const p of ALL){assert.equal(p.options.length,2);assert.ok(p.answer===0||p.answer===1);assert.ok(p.why.length>10);
    assert.ok(!/(사세요|파세요|사라|팔아|오를 거|떨어질 거|목표가)/.test(p.q+p.why),p.id)}
});
test('a day deals DESK.perDay papers, mixed topics, unseen first, the same for everyone', () => {
  const a=D.bundleOfDay(ALL,'2026-11-20');assert.equal(a.length,D.DESK.perDay);assert.deepEqual(D.bundleOfDay(ALL,'2026-11-20'),a);
  assert.ok(new Set(a.map(id=>ALL.find(p=>p.id===id).topic)).size>=Math.min(4,D.DESK.perDay));
  const seen=ALL.slice(0,50).map(p=>p.id),b=D.bundleOfDay(ALL,'2026-11-21',seen);
  assert.equal(b.filter(id=>!seen.includes(id)).length,Math.min(6,D.DESK.perDay));
});
test('stamps one at a time; experience once when the bundle is done; the level from DESK', () => {
  const ids=D.bundleOfDay(ALL,'d');let d=D.newDay('d',ids);const P=id=>ALL.find(p=>p.id===id);
  d=D.stampPaper(d,P(ids[1]),0);assert.equal(d.stamps.length,0);// not the paper on top
  for(const [i,id] of ids.entries())d=D.stampPaper(d,P(id),i===0?null:P(id).answer);
  assert.equal(D.stampPaper(d,P(ids[0]),0),d);assert.equal(d.stamps[0].right,false);
  const f=D.finishDay(d);assert.equal(f.xp,(ids.length-1)*D.DESK.xpRight+D.DESK.xpDone);assert.equal(D.finishDay(f),f);
  let h=H.putDesk(H.HOUSE0,f);assert.equal(h.xp,f.xp);assert.equal(H.putDesk(h,f),h);
  assert.equal(D.levelOf(0).lv,1);assert.equal(D.levelOf(D.xpFor(D.DESK.unlockLevel)).lv,D.DESK.unlockLevel);
  assert.deepEqual(D.stampMark('x'),D.stampMark('x'));
});
test('도전: two papers first make 500; each challenge stakes it on two more; stop takes the step, a miss loses it all; 10만 ends it', () => {
  const P=id=>ALL.find(p=>p.id===id);assert.equal(D.DESK.perDay,2);
  const ids=D.bundleOfDay(ALL,'r');let d=D.newDay('r',ids);
  const step=(right)=>{const p=P(D.nextPaper(d));d=D.finishDay(D.stampPaper(d,p,right?p.answer:1-p.answer))};
  const go=(lv)=>{d=D.challenge(d,lv,D.challengePapers(ALL,'r',[],d.ids,lv))};
  step(true);assert.equal(d.run,undefined);assert.equal(D.choosing(d),false);
  step(true);assert.equal(d.run,true);assert.equal(d.done,false);assert.equal(D.choosing(d),true);assert.equal(D.stepCoins(d),500);
  assert.equal(D.quizCoins(d),0);assert.equal(D.quizCoins(D.stopRun(d)),500);
  go('easy');assert.equal(d.level,'easy');assert.equal(d.ids.length,4);assert.equal(D.choosing(d),false);assert.equal(new Set(d.ids).size,4);
  step(true);assert.equal(D.choosing(d),false);step(true);assert.equal(D.stepCoins(d),1000);
  // the level stays as it was first chosen
  go('hard');assert.equal(d.level,'easy');step(true);step(true);assert.equal(D.stepCoins(d),2000);
  const st=D.stopRun(d);assert.equal(st.done,true);assert.equal(D.quizCoins(st),2000);assert.equal(D.stopRun(st),st);
  // a miss in a challenge ends at once and loses it all
  go('easy');step(false);assert.equal(d.done,true);assert.equal(d.ids.length,7);assert.equal(D.quizCoins(d),0);assert.equal(D.stopRun(d),d);
  // all the way: 100,000 at the last step, the run closes paid
  let e=D.newDay('t',D.bundleOfDay(ALL,'t'));d=e;step(true);step(true);
  for(let i=0;i<6;i++){go('easy');step(true);step(true)}
  assert.equal(d.done,true);assert.equal(D.quizCoins(d),100000);assert.equal(D.choosing(d),false);
  // 어려움 pays more at each step
  for(let i=1;i<7;i++)assert.ok(D.CHALLENGE.hard[i]>D.CHALLENGE.easy[i]);
  // one of the first two wrong: no coins, no challenge
  e=D.newDay('w',D.bundleOfDay(ALL,'w'));const p0=P(D.nextPaper(e));e=D.finishDay(D.stampPaper(e,p0,1-p0.answer));assert.equal(e.done,false);
  const p1=P(D.nextPaper(e));e=D.finishDay(D.stampPaper(e,p1,p1.answer));
  assert.equal(e.done,true);assert.equal(e.run,undefined);assert.equal(D.quizCoins(e),0);
});
test('the unlock is written once, on the day it happens, and never goes back', () => {
  let h=H.HOUSE0;h=H.afterQuiz(h,4,'d1');assert.equal(h.unlocked,false);
  h=H.afterQuiz(h,5,'d2');assert.deepEqual([h.unlocked,h.unlockedOn],[true,'d2']);
  assert.equal(H.afterQuiz(h,6,'d3'),h);
});
test('the desk follows the table of 설계 2장', () => {
  const D=(o)=>H.deskState({unlocked:false,unlockedOn:null,quizDone:false,caseStatus:null,day:'d',...o});
  assert.equal(D({}),'quiz');assert.equal(H.doorOpen('quiz'),false);
  assert.equal(D({quizDone:true}),'locked-done');assert.equal(H.doorOpen('locked-done'),true);
  assert.equal(D({unlocked:true,unlockedOn:'d',quizDone:true}),'unlocked');
  assert.equal(D({unlocked:true,unlockedOn:'x'}),'quiz-first');assert.equal(H.doorOpen('quiz-first'),false);
  assert.equal(D({unlocked:true,unlockedOn:'x',quizDone:true,caseStatus:'open'}),'case');
  assert.equal(D({unlocked:true,unlockedOn:'d',quizDone:true,caseStatus:'open'}),'case');
  assert.equal(D({unlocked:true,unlockedOn:'x',quizDone:true,caseStatus:'done'}),'day-done');
  assert.equal(H.lockPlate(3).now,'현재 Lv.3');assert.match(H.lockPlate(3).title,/Lv\.5/);
});
test('one case file a day, only once unlocked; finishing counts once', () => {
  let h=H.assignCase(H.HOUSE0,'d','p1');assert.equal(h.cases.length,0);
  h=H.afterQuiz(h,5,'d');h=H.assignCase(h,'d','p1');h=H.assignCase(h,'d','p2');assert.deepEqual(h.cases.map(c=>c.packId),['p1']);
  h=H.setCaseStatus(h,'d','done');h=H.setCaseStatus(h,'d','done');assert.equal(h.solved,1);
});
const pack=JSON.parse(fs.readFileSync(new URL('../public/game/packs/05fb33fa.json',import.meta.url)));
test('papers on the desk are only what was out by then', () => {
  let p=P.skipToMoment(pack,P.begin(P.startPlay(pack,1)));assert.equal(p.phase,'moment');
  const docs=C.docsAt(pack,p.tick,p.moment.code),last=pack.days[p.tick];
  assert.ok(docs.length>0);assert.ok(docs.every(d=>d.d<=last));
  assert.ok(docs.every(d=>!pack.companies.some(c=>d.title.includes(c.name))),'names are hidden');
});
test('a page needs direction, reason and the hold choice; then the sell fills like an order and time runs on', () => {
  let p=P.skipToMoment(pack,P.begin(P.startPlay(pack,1)));
  const m=C.masteryOf(0);assert.deepEqual(C.missing(C.DRAFT0,m),['방향','이유','보유 수량']);
  assert.deepEqual(C.missing(C.DRAFT0,C.masteryOf(2)),['방향','이유','근거','반례','보유 수량']);
  const before=P.qtyHeld(pack,p,p.moment.code);
  const r=C.confirmPage(pack,p,{direction:'down',reason:'시장보다 더 빠졌다',evidence:[],counter:'',sell:0.5});
  assert.ok(r);assert.equal(r.play.orders.at(-1).qty,Math.floor(before*0.5));assert.equal(r.page.code,p.moment.code);
  assert.equal(C.confirmPage(pack,r.play.phase==='flow'?r.play:{...r.play,phase:'flow'},{direction:'up',reason:'x',evidence:[],counter:'',sell:0}),null);
});
test('the back of the file grades the reasoning and checks each guess', () => {
  let p=P.begin(P.startPlay(pack,1)),pages=[];
  for(let k=0;k<20&&p.phase!=='reveal';k++){p=P.skipToMoment(pack,p);if(p.phase!=='moment')break;
    const r=C.confirmPage(pack,p,{direction:'flat',reason:'근거를 보고 판단함',evidence:[{docId:'ev:x',line:0,text:'t'}],counter:'반대 이유',sell:0});p=r.play;pages.push(r.page)}
  const res=C.caseResult(pack,p,pages);
  assert.equal(res.verdicts.length,pages.length);assert.ok(res.score>=75&&res.score<=100);
  assert.equal(res.hold,res.me,'kept everything: same as holding');
});
