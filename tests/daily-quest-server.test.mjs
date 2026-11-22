// 오늘의 관측소, the server side (app/core/game/daily/server.ts, db/functions/quest-settle): the replay gives the same
// result as the app, the checks refuse what the app would never send, investor_progress comes from the award ledger,
// 보리's save keeps it, and 보리's LLM cannot write it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load} from './load-app.mjs';
const M=await load('core/game/daily/model'),S=await load('core/game/daily/settle'),V=await load('core/game/daily/server'),C=await load('content/daily/solbit');
const R=await load('core/llm1/registry'),PU=await load('core/llm1/profile'),VA=await load('core/llm1/validate');
const Qc=await load('core/game/daily/course'),SPc=await load('content/daily/server-packs');
const P=C.SOLBIT,DAY='2026-11-18',NOW=Date.parse('2026-11-18T03:00:00Z');
const json=f=>JSON.parse(fs.readFileSync(new URL('../app/content/llm1/'+f,import.meta.url),'utf8'));
const texts=['약속한 10배보다 비싼 12배라서 자본배분 기준이 어긋났고 신뢰가 약해졌다.','검토서로 절차는 나아졌지만 원가절감 절반이 미체결이라 약속 이행에 대한 이전 판단을 유지한다.','비용절감 60% 달성은 약속 이행을 지지하지만 통합 지연 때문에 신뢰를 처음보다 일부만 높인다.'];
const sub=(quest='q1',over={})=>({run:'r1',quest,pack:P.id,version:P.version,day:DAY,
  decisions:P.scenes.map((s,i)=>({scene:s.id,fraction:['1/4','0','1/2'][i],fields:{dir:'비슷',hypo:texts[i],reason:'12배는 확정된 계약 가격이다.',ev:['c3','d3','e2'][i],counter:'만약 원가절감 9배 추정이 맞다면 판단은 바뀐다.',recheck:'다음 실적에서 다시 본다.'}})),...over});
const st=(finishedQuests=[],awards=[])=>({finishedQuests,awards});

test('the server replay matches the app: same journal score, same returns, same XP', () => {
  // the app's own path
  let r=M.setStage(M.startRun(P,Qc.questById('q1'),DAY,NOW,[],'r1'),'scene');
  P.scenes.forEach((s,i)=>{r=M.setPick(M.setDraft(r,s.id,{dir:'비슷',hypo:texts[i]}),s.id,['1/4','0','1/2'][i]);r=M.decide(P,r,s.id,NOW).run});
  const app=S.settle(P,r,M.blankProgress(),DAY,NOW);
  const v=V.verifySubmission(P,sub(),st(),DAY,NOW);
  assert.equal(v.ok,true);
  assert.equal(v.run.result.journal,app.run.result.journal);
  assert.equal(v.run.result.excess,app.run.result.excess);
  assert.equal(v.run.result.xp.xp,app.run.result.xp.xp);
  assert.equal(v.award.xp,app.progress.total_xp);
  assert.equal(v.progress.total_xp,app.progress.total_xp);
  assert.equal(v.run.mode,'ranked');
});

test('the checks: pack and version, no skipping the course, no future day, scenes in order, valid choices', () => {
  assert.equal(V.verifySubmission(null,sub(),st(),DAY,NOW).error,'pack');
  assert.equal(V.verifySubmission(P,sub('q1',{version:99}),st(),DAY,NOW).error,'pack');
  assert.equal(V.verifySubmission(P,sub('q99'),st(),DAY,NOW).error,'quest');
  assert.equal(V.verifySubmission(P,sub('q2'),st(),DAY,NOW).error,'locked');// q1 not finished yet
  assert.equal(V.verifySubmission(P,sub('q2'),st(['q1']),DAY,NOW).ok,true);
  assert.equal(V.verifySubmission(P,sub('q1',{day:'2026-11-19'}),st(),DAY,NOW).error,'day');
  const swapped=sub();swapped.decisions=[swapped.decisions[1],swapped.decisions[0],swapped.decisions[2]];
  assert.equal(V.verifySubmission(P,swapped,st(),DAY,NOW).error,'scenes');
  const bad=sub();bad.decisions[0].fraction='1';
  assert.equal(V.verifySubmission(P,bad,st(),DAY,NOW).error,'fraction:s1');
  const empty=sub();empty.decisions[1].fields={hypo:'  '};
  assert.equal(V.verifySubmission(P,empty,st(),DAY,NOW).error,'missing:s2');
  // q2 needs a card for its reason; a card from a later scene does not count
  const later=sub('q2');later.decisions[0].fields.ev='e2';
  assert.equal(V.verifySubmission(P,later,st(['q1']),DAY,NOW).error,'missing:s1');
  // a client score, XP or extra keys are simply not read
  const forged=sub();forged.xp=9999;forged.decisions[0].fields.score=100;
  assert.ok(V.verifySubmission(P,forged,st(),DAY,NOW).award.xp<=125);
});

test('ranked once per (day, pack, quest); a late finish is practice; text is capped', () => {
  const a=V.verifySubmission(P,sub(),st(),DAY,NOW);
  const again=V.verifySubmission(P,sub('q1',{run:'r2'}),st(['q1'],[a.award]),DAY,NOW);
  assert.equal(again.run.mode,'practice');assert.equal(again.award,null);assert.equal(again.progress.total_xp,a.progress.total_xp);
  const late=V.verifySubmission(P,sub('q1',{day:'2026-11-17'}),st(),DAY,NOW);
  assert.equal(late.ok,true);assert.equal(late.run.mode,'practice');assert.equal(late.award,null);
  const long=sub();long.decisions[0].fields.hypo='가'.repeat(5000);
  assert.equal(V.verifySubmission(P,long,st(),DAY,NOW).run.decisions[0].fields.hypo.length,600);
});

test('investor_progress is the ledger folded: order-free, duplicates ignored, titles follow', () => {
  const aw=(id,xp,at)=>({quest:'q1',excess:0,journal:80,market:10,writing:24,bonus:0,xp,dailyId:'d'+id,runId:'r'+id,at});
  const ledger=[aw(2,120,2),aw(1,125,1),aw(3,125,3),aw(4,125,4),aw(1,125,9)];
  const p=V.progressFromAwards(ledger);
  assert.equal(p.total_xp,495);assert.equal(p.awards.length,4);
  assert.deepEqual([p.rank,p.level],['견습 관측원',5]);
  assert.deepEqual(V.progressFromAwards([...ledger].reverse()).total_xp,495);
  assert.deepEqual(V.progressFromAwards([]),M.blankProgress());
});

test('the profile: the template carries investor_progress; settle writes it with a new revision; 보리 keeps it', () => {
  const tpl=json('user_profile_template.json');
  assert.deepEqual(tpl.investor_progress,{total_xp:0,rank:'견습 관측원',level:1,awards:[]});
  assert.equal(tpl.schema_version,'5.0');assert.deepEqual(tpl.memory_policy,{blocked_profile_paths:[]});
  const doc={user_id:'u',revision:4,updated_at:null,json:{...structuredClone(tpl),revision:4}};
  const p={total_xp:67,rank:'견습 관측원',level:1,awards:[]};
  const w=V.withProgress(doc,p,'2026-11-18T03:00:00Z');
  assert.equal(w.revision,5);assert.equal(w.json.revision,5);assert.deepEqual(w.json.investor_progress,p);
  assert.equal(doc.revision,4);// not mutated
  // 보리 read revision 4, learned something (5); meanwhile quest-settle wrote 5 with XP: the save keeps the XP, moves on
  const ours={...doc,revision:5,json:{...doc.json,revision:5,interests:'반도체'}};
  const m=V.mergeProgress(ours,w,4);
  assert.deepEqual(m.json.investor_progress,p);assert.equal(m.json.interests,'반도체');assert.equal(m.revision,6);assert.equal(m.json.revision,6);
  // nobody wrote in between: the save is unchanged but still carries the stored progress
  const quiet=V.mergeProgress(ours,doc,4);assert.equal(quiet.revision,5);
  assert.equal(V.mergeProgress(ours,null,4),ours);
});

test("보리's LLM cannot write investor_progress: the field registry has no such path", () => {
  const reg=new R.FieldRegistry(json('field_registry.json'),()=>[]);
  const up=new PU.ProfileUpdater(reg,json('strategy_template.json'),()=>'s1',()=>'2026-11-18T00:00:00Z');
  const uj={...structuredClone(json('user_profile_template.json')),revision:0};
  const out=up.apply(uj,{base_revision:0,changes:[{op:'set',path:'investor_progress.total_xp',value:{value:9999},basis:'explicit',confidence:'high',scope:'general',evidence_summary:'x',source_refs:[]}]},
    new VA.MessageIndex([]),{inputRevision:0,inputBuiltAt:'2026-11-18T00:00:00Z'});
  assert.equal(out.applied.length,0);assert.equal(out.rejected.length,1);
  assert.equal(out.json.investor_progress.total_xp,0);
});

test('official packs scene by scene: the cut hides later scenes, prices past this close and the reveal', async () => {
  const O=await load('core/game/daily/official');
  const d0=O.sceneDto(P,0);
  assert.equal(d0.scenes.length,3);
  // this scene whole, except what was announced later (feedback F2: the values a hypothesis is checked against)
  assert.deepEqual(d0.scenes[0],{...P.scenes[0],observe:{...P.scenes[0].observe,actual:undefined}});
  assert.equal(d0.scenes[1].title,'');assert.equal(d0.scenes[1].cards.length,0);assert.equal(d0.scenes[2].tick,-1);
  assert.equal(d0.prices.length,P.scenes[0].tick+1);assert.equal(d0.index.length,P.scenes[0].tick+1);
  assert.equal(d0.evalTick,-1);assert.equal(d0.reveal.company,'');assert.deepEqual(d0.reveal.sources,[]);
  const json=JSON.stringify(d0);for(const c of P.scenes[1].cards.concat(P.scenes[2].cards))assert.ok(!json.includes(c.fact),c.id);
  assert.ok(!json.includes(P.reveal.event));assert.ok(!json.includes('"actual"'));
  // decide scene by scene: out of order refused; each step cuts one scene further; the last gives the whole pack
  let st={run:'r1',quest:'q1',pack:P.id,version:1,day:DAY,decisions:[]};
  const sub0=sub().decisions;
  assert.equal(O.playDecide(P,st,sub0[1],{finishedQuests:[],awards:[]},NOW).error,'order');
  assert.equal(O.playDecide(P,st,{...sub0[0],fields:{hypo:' '}},{finishedQuests:[],awards:[]},NOW).error,'missing:s1');
  let r=O.playDecide(P,st,sub0[0],{finishedQuests:[],awards:[]},NOW);assert.equal(r.ok,true);assert.equal(r.done,false);
  assert.deepEqual(r.dto.scenes[1],{...P.scenes[1],observe:{...P.scenes[1].observe,actual:undefined}});assert.equal(r.dto.scenes[2].title,'');assert.equal(r.dto.prices.length,P.scenes[1].tick+1);
  // the fill of scene 1's decision (the next day's open) is in this cut
  assert.ok(r.dto.prices.length>P.scenes[0].tick+1);
  st=r.state;r=O.playDecide(P,st,sub0[1],{finishedQuests:[],awards:[]},NOW);st=r.state;
  r=O.playDecide(P,st,sub0[2],{finishedQuests:[],awards:[]},NOW);assert.equal(r.done,true);assert.deepEqual(r.dto,P);
  assert.equal(O.playDecide(P,r.state,sub0[2],{finishedQuests:[],awards:[]},NOW).error,'finished');
  // settle accepts exactly the committed decisions, nothing else
  assert.equal(O.sameDecisions(r.state.decisions,sub0.map(x=>({...x,fields:{...M.blankFields(),...x.fields}}))),true);
  assert.equal(O.sameDecisions(r.state.decisions,sub0.map((x,i)=>i===0?{...x,fraction:'3/4'}:x)),false);
  // the cut pack still plays: the app's own fill and performance helpers work on it
  assert.equal(M.fval(M.leftAfter(d0,[],'1/4')),60);
});

test('server drafts: the revision the writer saw must still be the stored one; otherwise the latest comes back', async () => {
  const O=await load('core/game/daily/official');
  let doc={drafts:{},rev:0};
  const a=O.applyDraft(doc,'s1',{hypo:'초안 하나',score:99},0,['s1']);assert.equal(a.ok,true);doc=a.doc;
  assert.deepEqual(doc,{drafts:{s1:{hypo:'초안 하나',reason:'',counter:'',recheck:'',ev:null,target:null,period:null,dir:null,shift:null}},rev:1});
  // another device saved revision 1 → 2 while this one still holds 1
  const b=O.applyDraft(doc,'s1',{hypo:'다른 기기'},1,['s1']);doc=b.doc;
  const c=O.applyDraft(doc,'s1',{hypo:'늦은 쪽'},1,['s1']);assert.equal(c.ok,false);assert.equal(c.conflict.drafts.s1.hypo,'다른 기기');assert.equal(c.conflict.rev,2);
  assert.equal(O.applyDraft(doc,'s1',{hypo:'늦은 쪽'},2,['s1']).doc.drafts.s1.hypo,'늦은 쪽');// keeping mine: resend with the latest revision
  assert.equal(O.applyDraft(doc,'zz',{},2,['s1']).error,'scene');
  assert.equal(O.applyDraft(doc,'s1',{hypo:'가'.repeat(900)},2,['s1']).doc.drafts.s1.hypo.length,600);
});

test('several companies on the server: the replay and the cut handle the comparison company', async () => {
  const O=await load('core/game/daily/official'),L5=SPc.SOLBIT_L5;
  const s5={run:'r5',quest:'q10',pack:L5.id,version:1,day:DAY,decisions:L5.scenes.map((s,i)=>({scene:s.id,fraction:i===1?'1/2':'0',fields:{hypo:'약속한 배당을 지켜서 신뢰를 유지한다.',reason:'배당 유지는 확정 공시다.',ev:s.cards[0].id,counter:'만약 가격이 오르면 바뀐다.',recheck:'다음 실적.'}}))};
  const v=V.verifySubmission(L5,s5,st(['q1','q2','q3','q4','q5','q6','q7','q8','q9']),DAY,NOW);assert.equal(v.ok,true);
  const d1=O.sceneDto(L5,1);assert.equal(d1.others[0].prices.length,L5.scenes[1].tick+1);assert.equal(d1.scenes[1].target,'B');
  assert.deepEqual(O.checkPackShape({...L5,id:'lvl-five',sample:false},[]),[]);
  assert.ok(O.checkPackShape({...L5,id:'lvl-five',sample:false,scenes:L5.scenes.map((s,i)=>i===1?{...s,target:'C'}:s)},[]).includes('scene 2 target'));
  assert.ok(O.checkPackShape({...L5,id:'lvl-five',sample:false,others:[{...L5.others[0],prices:L5.others[0].prices.slice(1)}]},[]).includes('other B'));
});

test('one new request a day: a quest not done before cannot start on a day another one was finished', () => {
  const s2=sub('q2');
  assert.equal(V.verifySubmission(P,s2,{finishedQuests:['q1'],awards:[],finishedOn:[{quest:'q1',day:DAY}]},DAY,NOW).error,'one-a-day');
  assert.equal(V.verifySubmission(P,s2,{finishedQuests:['q1'],awards:[],finishedOn:[{quest:'q1',day:'2026-11-17'}]},DAY,NOW).ok,true);
  // replaying the one finished today is fine (practice)
  assert.equal(V.verifySubmission(P,sub('q1',{run:'again'}),{finishedQuests:['q1'],awards:[],finishedOn:[{quest:'q1',day:DAY}]},DAY,NOW).ok,true);
});
