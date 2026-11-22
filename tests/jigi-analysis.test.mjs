// 지기 J3 (app/core/jigi/analysis.ts, points.ts): hit rates with a Wilson interval, demo pages only while I have none,
// practice and post-hoc pages never counted, the style (유형) from what was written, 보완할 점 only when the numbers hold
// them, and process points for the work.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const A=await load('core/jigi/analysis');
const P=await load('core/jigi/points');
const J=await load('core/jigi/journal');
const SD=await load('core/jigi/seed');
const R=await load('core/rank');
const L=await load('core/league');
const today='2026-11-15',now=Date.parse('2026-11-15T10:00:00Z');

test('wilson: the interval holds the rate and narrows with more verdicts', () => {
  const a=A.wilson(3,5),b=A.wilson(30,50);
  assert.ok(a.lo<.6&&a.hi>.6&&b.lo<.6&&b.hi>.6);assert.ok(b.hi-b.lo<a.hi-a.lo);assert.equal(A.wilson(0,0),null);
});

test('the demo pages count only while I have none of my own; practice never counts', () => {
  const demo=SD.demoJournals(now,()=>null);
  const d=A.analyze(demo,{now,today});
  assert.equal(d.demoOnly,true);assert.ok(d.n>=8,String(d.n));assert.equal(d.rows.filter(r=>r.h.domain==='경기').every(r=>!r.dec),true);
  const mine={...J.newJournal('m',now-200*864e5,today,{code:'005930'}),status:'saved',versions:[{at:now-200*864e5,label:'최초 저장'}]};
  const practice={...mine,id:'p',practice:true};
  const m=A.analyze([...demo,mine,practice],{now,today});
  assert.equal(m.demoOnly,false);assert.deepEqual(m.journals.map(j=>j.id),['m']);
  assert.match(A.observe(m.dom,'분야'),/아직 적어요/);
});

test('보완할 점 show up only from the numbers, each with a task; filters narrow the pages', () => {
  const base=SD.demoJournals(now,()=>null);
  const a=A.analyze(base,{now,today});
  for (const t of a.findings){assert.ok(t.ev.length>0);assert.ok(t.task.act.length>0);assert.equal(t.task.why,t.ev.join(', '));assert.ok(!/유형/.test(t.name),t.name)}
  assert.ok(a.findings.length<=3);
  const one=A.analyze(base,{now,today,code:'005930'});assert.ok(one.journals.every(j=>j.stock.code==='005930'));
  assert.ok(A.analyze(base,{now,today,periodDays:60}).journals.length<base.length);
  assert.ok(a.changes.length>0);assert.ok(a.changes[0].steps.length>=2);
});

test('process points: save, confirm, review, practice; demo and practice earn nothing; they feed the week and the titles', () => {
  const at=Date.parse('2026-11-16T09:00:00Z');// a Monday
  const j={...J.newJournal('w',at,'2026-11-16',{code:'005930'}),status:'saved',versions:[{at,label:'최초 저장'}],
    hypos:[{id:'h',status:'confirmed',auto:true,confirmedAt:at+1000,domain:'주가',form:'방향'}],reflection:{plan:'예',missed:'',change:'',at:at+2000}};
  const acts=P.acts([j,{...j,id:'d',demo:true},{...j,id:'p',practice:true}],[{id:'t',text:'x',at:at-1}]);
  assert.deepEqual(acts.map(a=>a.kind),['saved','practiced','confirmed','reviewed']);
  assert.equal(P.weekWork([j],[],'2026-11-18'),P.WORK.saved+P.WORK.confirmed+P.WORK.reviewed);
  assert.equal(P.weekWork([j],[],'2026-11-25'),0);
  assert.equal(L.weekPoints([],[],'2026-11-18',8),8);
  assert.equal(R.xpOf({graded:0,cases:0,rewinds:0,work:3}),3*R.XP.work);
});

test('monthly report: my journals, verdicts and reviews of that month; demo pages left out', async () => {
  const LT=await load('core/letter');
  const at=Date.parse('2026-10-05T09:00:00Z');
  const j={...J.newJournal('w',at,'2026-10-05',{code:'005930'}),status:'saved',versions:[{at,label:'최초 저장'}],
    hypos:[{id:'h',status:'confirmed',auto:true,confirmedAt:at,domain:'주가',form:'방향',dir:'상승',endDate:'2026-10-20',base:{date:'2026-10-02',close:1}}],reflection:{plan:'예',missed:'',change:'',at:at+864e5}};
  const l=LT.letterOf('2026-10',[],[],{cases:[],rewinds:[],stamps:[],journals:[j,{...j,id:'d',demo:true}]},x=>x);
  assert.deepEqual(l.jigi,{journals:1,verdicts:1,hits:1,reviews:1});
  assert.equal(LT.letterDue('2026-11-02',[],l),true);
});

test('유형 is the style of judging, read from what was written — the same whatever the verdicts say', () => {
  const base=SD.demoJournals(now,()=>null);
  const a=A.analyze(base,{now,today}),later=A.analyze(SD.demoJournals(now+4*864e5,()=>null),{now:now+4*864e5,today:'2026-11-19'});
  assert.ok(a.style);assert.deepEqual(later.style,a.style);// the verdicts moved (other dates), the style did not
  assert.deepEqual(a.style.traits.map(t=>t.key),['basis','horizon','conf','act','counter','change']);
  assert.ok(!/(보완|다시 맞출|공부할|적중)/.test(a.style.name),a.style.name);
  // the demo: three bases tied → several together; 1~3 months → short; half high → 확신형; no counter-evidence written
  assert.equal(a.style.name,'여러 근거를 함께 짧게 보는 확신형');
  assert.equal(a.style.traits.find(t=>t.key==='counter').value,'한쪽 근거로 보는 편');
  // one basis clearly ahead names it; a long horizon and little conviction read as such
  const mk=(i,f)=>({...J.newJournal('s'+i,now-i*864e5,today,{code:'005930'}),status:'saved',versions:[{at:now,label:'최초 저장'}],f:{...J.blankFields(),...f}});
  const mine=[0,1,2,3].map(i=>mk(i,{hypo:'영업이익이 늘 것 같다',reason:i<3?'분기보고서의 매출과 재고를 봤다':'금리가 내려서',horizon:'1년',conf:'보통',action:'보유',opt:{counter:i<2?'경쟁사 가격 인하':''}}));
  const m=A.analyze(mine,{now,today});
  assert.equal(m.style.name,'실적을 근거로 길게 보는 신중형');
  assert.equal(m.style.traits.find(t=>t.key==='act').value,'들고 가는 편');
  assert.equal(m.style.traits.find(t=>t.key==='counter').value,'반대 근거를 챙기는 편');
  assert.equal(A.analyze(mine.slice(0,2),{now,today}).style,null);// too few to say
});
