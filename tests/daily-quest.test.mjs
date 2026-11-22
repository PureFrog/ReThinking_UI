// 오늘의 관측소 (app/core/game/daily, daily_quest_design v1 + feedback F1·F2): the course (server only) and one request a
// day, the structured hypothesis and its tiers, a run through three scenes with a new journal each, exact partial sales,
// the two scores, XP policy v1, titles, investor_progress, and the sample packs' numbers.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const Q=await load('core/game/daily/course'),SP=await load('content/daily/server-packs'),M=await load('core/game/daily/model'),J=await load('core/game/daily/judge'),S=await load('core/game/daily/settle'),C=await load('content/daily/solbit'),DP=(await load('content/daily/danpung')).DANPUNG,PK=await load('content/daily/packs');
const P=C.SOLBIT,DAY='2026-11-18',NOW=Date.parse('2026-11-18T03:00:00Z');

// play a run to the end with the given drafts and fractions
function play(questId,fills,texts,runs=[],day=DAY){
  let r=M.startRun(P,Q.questById(questId),day,NOW,runs,'r'+runs.length);
  r=M.setStage(r,'scene');
  P.scenes.forEach((s,i)=>{r=M.setDraft(r,s.id,texts(i));r=M.setPick(r,s.id,fills[i]);const o=M.decide(P,r,s.id,NOW+i);assert.ok('run' in o,JSON.stringify(o));r=o.run});
  return r;
}
const good=i=>({dir:['감소','비슷','증가'][i],hypo:['약속한 10배보다 비싼 12배라서 자본배분 기준이 어긋났고 신뢰가 약해졌다.','검토서로 절차는 나아졌지만 원가절감 절반이 미체결이라 약속 이행에 대한 이전 판단을 유지한다.','비용절감 60% 달성은 약속 이행을 지지하지만 통합 지연 때문에 신뢰를 처음보다 일부만 높인다.'][i],
  reason:['12배는 확정된 계약 가격이다.','절반이 미체결 계획이다.','60% 달성은 확정 실적이다.'][i],ev:['c3','d3','e2'][i],
  counter:['만약 원가절감 9배 추정이 맞다면 판단은 바뀐다.','하지만 경쟁사 협상이 공급사 가격을 올리면 절감은 줄어든다.','다만 통합 지연이 한 분기에서 끝나면 판단은 달라진다.'][i],
  recheck:['다음 실적에서 비용절감이 목표에 못 미치면 다시 본다.','공급 계약이 맺어지면 다시 본다.','통합이 끝난 분기 실적을 보면 다시 본다.'][i]});

test('the course (server only): tiers, one new practice a day; today\'s request is the one finished today, else the first unfinished', () => {
  assert.deepEqual(Q.COURSE.map(q=>q.tier),['입문','기초','기초','기초','기초','중급','중급','중급','상급','상급']);
  assert.equal(new Set(Q.COURSE.map(q=>q.teaches)).size,Q.COURSE.length);// every day teaches something new
  // 기초 is not one task: four different practices, the target always given, the period chosen on one day only
  const basic=Q.COURSE.filter(q=>q.tier==='기초');
  assert.deepEqual(basic.map(q=>[q.fields.join('+'),q.evFrom??'',q.aid.target,q.aid.period]),
    [['hypo+reason','','given','given'],['hypo+reason','focus','given','given'],['hypo','','given','choose'],['hypo+shift','','given','given']]);
  // 입문 gives target and period; 중급 picks the target, and its first counterexample day gives both again; 상급 writes freely
  assert.deepEqual(Q.COURSE[0].aid,{target:'given',period:'given'});
  assert.equal(Q.questById('q6').aid.target,'choose');
  const firstCounter=Q.COURSE.find(q=>q.fields.includes('counter'));assert.equal(firstCounter.tier,'중급');assert.deepEqual(firstCounter.aid,{target:'given',period:'given'});
  assert.ok(Q.COURSE.filter(q=>q.tier==='상급').every(q=>!q.aid));
  assert.deepEqual(Q.requestFor([],DAY),{def:Q.COURSE[0],done:false});
  // finished q1 today: today's request stays q1 (done) — q2 arrives tomorrow
  assert.deepEqual(Q.requestFor([{quest:'q1',day:DAY}],DAY),{def:Q.COURSE[0],done:true});
  assert.deepEqual(Q.requestFor([{quest:'q1',day:DAY}],'2026-11-19'),{def:Q.COURSE[1],done:false});
  assert.equal(Q.requestFor(Q.COURSE.map((q,i)=>({quest:q.id,day:'2026-11-0'+(i+1)})),DAY),null);
  // a run carries the definition it was given; the app never needs the list
  const r=M.startRun(P,Q.COURSE[1],DAY,NOW,[],'d');assert.deepEqual(r.def,Q.COURSE[1]);assert.notEqual(r.def,Q.COURSE[1]);
  assert.deepEqual(M.defOf({quest:'old'}).fields,['hypo']);// a run saved before definitions travelled
  assert.equal(M.COURSE,undefined);assert.equal(M.questById,undefined);
});

test('the app never imports the course or the server-only packs (feedback: 미래 과제는 백엔드에만)', async () => {
  const fs=await import('node:fs'),path=await import('node:path');
  const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
  const app=(await import('node:url')).fileURLToPath(new URL('../app/',import.meta.url));
  const shipped=[...walk(app+'proto3d'),...walk(app+'content'),...walk(app+'editor'),app+'page.tsx'].filter(f=>/\.(ts|tsx)$/.test(f)&&!f.endsWith('server-packs.ts'));
  for(const f of shipped){const src=fs.readFileSync(f,'utf8');
    assert.ok(!/game\/daily\/course['"]/.test(src),`${f} imports the course`);assert.ok(!/server-packs['"]/.test(src),`${f} imports the server-only packs`)}
  // and what the app does load reaches neither (one import hop: the core modules it pulls in)
  for(const f of walk(app+'core/game/daily').filter(f=>!/(course|server|official)\.ts$/.test(f))){const src=fs.readFileSync(f,'utf8');
    assert.ok(!/from '\.\/course'/.test(src),`${f} imports the course`)}
});

test('a decision needs its fields and a choice together, and scenes go in order', () => {
  let r=M.setStage(M.startRun(P,Q.questById('q2'),DAY,NOW,[],'a'),'scene');
  assert.equal(M.decide(P,r,'s2',NOW).error,'order');
  assert.deepEqual(M.decide(P,r,'s1',NOW).missing,['hypo','reason']);
  r=M.setDraft(r,'s1',{hypo:'가설',reason:'근거',dir:'비슷'});
  assert.deepEqual(M.decide(P,r,'s1',NOW).missing,['reason']);// a reason needs its card
  r=M.setDraft(r,'s1',{ev:'c3'});
  assert.equal(M.decide(P,r,'s1',NOW).error,'choice');
  r=M.setPick(r,'s1','1/4');
  const o=M.decide(P,r,'s1',NOW);assert.equal(o.run.scene,1);assert.equal(o.run.stage,'scene');
  // every scene is a new journal (feedback F2): the next one opens blank; the confirmed one stays in decisions
  assert.deepEqual(o.run.drafts.s2,M.blankFields());assert.equal(o.run.decisions[0].fields.hypo,'가설');
  // a structured day: the reason alone is not a hypothesis — the direction is picked too
  const q1=M.setStage(M.startRun(P,Q.questById('q1'),DAY,NOW,[],'b'),'scene');
  assert.equal(q1.drafts.s1.hypo,'');assert.deepEqual(M.decide(P,q1,'s1',NOW).missing,['hypo']);
  assert.deepEqual(M.decide(P,M.setDraft(q1,'s1',{hypo:'이유'}),'s1',NOW).missing,['hypo']);
  assert.equal(M.decide(P,M.setDraft(q1,'s1',{hypo:'이유',dir:'비슷'}),'s1',NOW).error,'choice');
});

test('partial sales are exact fractions: 80 → 1/4 → 1/2 leaves 30, three halves leave 1/8', () => {
  const a=M.fillsOf(P,[{scene:'s1',fraction:'0'},{scene:'s2',fraction:'1/4'},{scene:'s3',fraction:'1/2'}]);
  assert.equal(M.fval(a.qty),30);
  const b=M.fillsOf(P,[{scene:'s1',fraction:'1/2'},{scene:'s2',fraction:'1/2'},{scene:'s3',fraction:'1/2'}]);
  assert.deepEqual(b.qty,{n:10,d:1});assert.equal(M.fval(b.qty)/80,1/8);
  // fills at the next day's open, fee 0.1%; cash adds up
  const f=b.fills[0];assert.equal(f.tick,P.scenes[0].tick+1);assert.equal(f.price,M.openAt(P,P.scenes[0].tick+1));
  assert.ok(Math.abs(f.cash-(P.cash+40*f.price*(1-M.FEE)))<1e-6);
  assert.equal(M.fval(M.leftAfter(P,[],'3/4')),20);
  const odd=M.fillsOf(P,[{scene:'s1',fraction:'3/4'},{scene:'s2',fraction:'1/2'},{scene:'s3',fraction:'1/2'}]);
  assert.deepEqual(odd.qty,{n:5,d:1});
  const q=M.fillsOf(P,[{scene:'s1',fraction:'1/4'},{scene:'s2',fraction:'1/4'},{scene:'s3',fraction:'1/4'}]).qty;
  assert.deepEqual(q,{n:135,d:4});// 33.75 shares, kept exact
});

test('performance: holding everything matches the do-nothing path; excess is in %p', () => {
  const hold=M.performance(P,[{scene:'s1',fraction:'0'},{scene:'s2',fraction:'0'},{scene:'s3',fraction:'0'}]);
  assert.ok(Math.abs(hold.excess)<1e-9);
  const start=P.cash+80*M.closeAt(P,P.scenes[0].tick);
  assert.ok(Math.abs(hold.ret-((P.cash+80*M.closeAt(P,P.evalTick))/start-1)*100)<1e-9);
});

test('XP policy v1: bar min(90,50+2n), base 25 + market 0~30 + writing 0~30 + bonus 40, at most 125', () => {
  assert.deepEqual(M.xpFor(0,0,49),{met:false,bar:50,base:0,market:0,writing:0,bonus:0,xp:0});
  assert.equal(M.xpFor(0,0,50).xp,25+10+15);
  assert.equal(M.xpFor(0,-3,60).market,0);
  assert.equal(M.xpFor(0,4,100).market,30);
  // bonus: excess ≥ 1 + 0.5·floor(n/5) and journal ≥ bar + 10
  assert.equal(M.xpFor(0,1,60).bonus,40);assert.equal(M.xpFor(0,.99,60).bonus,0);assert.equal(M.xpFor(0,1,59).bonus,0);
  assert.equal(M.xpFor(0,10,100).xp,125);
  assert.equal(M.xpFor(500,1.4,100).bonus,0);assert.equal(M.xpFor(500,1.5,100).bonus,40);// n=5 needs 1.5%p
  assert.equal(M.xpFor(2400,10,99).met,true);assert.equal(M.xpFor(2400,10,89).met,false);// bar caps at 90
  assert.equal(M.xpFor(2400,10,99).bonus,0);// 90+10 = 100 needed
});

test('titles: 100 XP a level, five levels a title, 500 → 보조 관측원 Lv.1, 2400 → 수석 관측원 Lv.5', () => {
  assert.deepEqual([M.titleOf(0).rank,M.titleOf(0).level],['견습 관측원',1]);
  assert.deepEqual([M.titleOf(499).rank,M.titleOf(499).level],['견습 관측원',5]);
  assert.deepEqual([M.titleOf(500).rank,M.titleOf(500).level],['보조 관측원',1]);
  assert.deepEqual([M.titleOf(2400).rank,M.titleOf(2400).level,M.titleOf(2400).next],['수석 관측원',5,null]);
  assert.deepEqual([M.titleOf(9999).rank,M.titleOf(9999).level],['수석 관측원',5]);// XP kept past the top
  assert.equal(M.titleOf(130).next.left,70);
});

test('settle: a ranked run pays once into investor_progress; practice and late runs pay nothing', () => {
  const r=play('q1',['0','1/4','1/2'],good);
  const a=S.settle(P,r,M.blankProgress(),DAY,NOW);
  assert.equal(a.run.result.journal,100);
  assert.ok(a.run.result.xp.xp>=25+15);
  assert.equal(a.progress.total_xp,a.run.result.xp.xp);
  assert.equal(a.progress.awards.length,1);
  assert.deepEqual(Object.keys(a.progress.awards[0]).slice(0,7),['quest','excess','journal','market','writing','bonus','xp']);
  // settling again, or awarding the same daily id again, changes nothing
  assert.equal(S.settle(P,a.run,a.progress,DAY,NOW).progress,a.progress);
  assert.equal(M.award(a.progress,{...a.progress.awards[0],runId:'other'}),a.progress);
  // the replay of the same day and quest is practice
  const again=play('q1',['0','0','0'],good,[a.run]);assert.equal(again.mode,'practice');
  assert.equal(S.settle(P,again,a.progress,DAY,NOW).progress.total_xp,a.progress.total_xp);
  // finished after its day: scores shown, no XP
  const late=S.settle(P,play('q1',['0','0','0'],good),M.blankProgress(),'2026-11-19',NOW);
  assert.equal(late.run.result.late,true);assert.equal(late.progress.total_xp,0);assert.equal(late.run.mode,'practice');
});

test('the trial judge: only asked axes count, the frame earns nothing, length alone earns nothing', () => {
  const g=J.gradeRun(P,Q.questById('q1'),[{scene:'s1',fields:good(0)},{scene:'s2',fields:good(1)},{scene:'s3',fields:good(2)}]);
  assert.deepEqual(g.scenes[0].dims.map(d=>d.key),['philosophy']);
  assert.deepEqual(g.scenes[1].dims.map(d=>d.key),['philosophy']);// 입문: the direction and its one line only
  assert.deepEqual(J.gradeRun(P,Q.questById('q2'),[{scene:'s1',fields:good(0)},{scene:'s2',fields:good(1)}]).scenes[1].dims.map(d=>d.key),['philosophy','evidence','review']);
  const full=J.gradeRun(P,Q.questById('q10'),[{scene:'s1',fields:good(0)}]);
  assert.deepEqual(full.scenes[0].dims.map(d=>d.key),['philosophy','evidence','logic']);
  assert.equal(full.scenes[0].score,100);
  // every quote is the player's own words
  for(const d of full.scenes[0].dims)assert.ok(Object.values(good(0)).some(v=>typeof v==='string'&&v.includes(d.quote.replace(/…$/,''))),d.quote);
  const frame=J.gradeRun(P,Q.questById('q1'),[{scene:'s1',fields:{...M.blankFields(),hypo:M.FRAME+'좋다'}}]);
  assert.equal(frame.scenes[0].score,0);
  const long=J.gradeRun(P,Q.questById('q1'),[{scene:'s1',fields:{...M.blankFields(),hypo:'오늘은 날씨가 좋고 기분이 좋아서 이 회사가 마음에 든다. '.repeat(20)}}]);
  assert.equal(long.scenes[0].score,0);
  // keeping and selling can both score fully: the judge never sees the choice
  assert.equal(J.TRIAL_JUDGE.grade.length,1);
});

test('the sample pack: cards agree with the prices, nothing past a scene is needed to play it', () => {
  const pc=(a,b)=>(b/a-1)*100,[s1,,s3]=P.scenes;
  assert.ok(Math.abs(pc(M.closeAt(P,s1.tick-1),M.closeAt(P,s1.tick))+7)<.5);// 발표 당일 −7%
  assert.ok(Math.abs(pc(P.index[s1.tick-1],P.index[s1.tick])+.3)<.05);// 시장 −0.3%
  assert.ok(Math.abs(pc(M.closeAt(P,s3.tick-1),M.closeAt(P,s3.tick))+4)<.5);// 실적 날 −4%
  assert.ok(Math.abs(pc(P.index[s3.tick-1],P.index[s3.tick])-.4)<.05);
  assert.ok(Math.abs(pc(M.closeAt(P,s1.tick),M.closeAt(P,s3.tick))-1)<.5);// 인수 발표 뒤 주가 +1%
  assert.ok(Math.abs(pc(P.index[s1.tick],P.index[s3.tick])-1.5)<.05);// 시장 +1.5%
  assert.ok(P.scenes[1].tick>s1.tick+1&&s3.tick>P.scenes[1].tick+1&&P.evalTick>s3.tick+1);// each scene after the last fill
  assert.ok(P.prices.length>P.evalTick&&P.index.length===P.prices.length);
  assert.ok(P.sample&&P.mentor.label.includes('실제 인물이 아니에요'));
  for(const s of P.scenes){assert.ok(s.cards.length>=3&&s.cards.length<=5);for(const id of s.focus)assert.ok(s.cards.some(c=>c.id===id))}
  assert.equal(M.kstDay(Date.parse('2026-11-18T15:30:00Z')),'2026-11-19');
});

test('rewards: first clear, five in a KST week, top 10% per measure after the day with ties shared, small days withheld', async () => {
  const W=await load('core/game/daily/rewards');
  assert.equal(W.weekOf('2026-11-19'),'2026-11-16');assert.equal(W.weekOf('2026-11-16'),'2026-11-16');assert.equal(W.weekOf('2026-11-22'),'2026-11-16');
  const c=(day,i)=>({day,dailyId:`${day}:p:q${i}`,runId:`r${day}${i}`});
  assert.deepEqual(W.completionGrants([]),[]);
  const four=['2026-11-16','2026-11-17','2026-11-18','2026-11-22'].map(c);
  assert.deepEqual(W.completionGrants(four).map(g=>g.key),['first-clear']);
  const five=[...four,c('2026-11-19',2)];
  const g=W.completionGrants(five);assert.deepEqual(g.map(x=>x.key),['first-clear','weekly-5:2026-11-16']);assert.equal(g[1].item,W.WEEK_ITEM);
  // the next Monday starts a new week
  assert.deepEqual(W.completionGrants([...four,c('2026-11-23',1)]).map(x=>x.key),['first-clear']);
  // a day's titles: 30 runs → the top 3 places; ties share the place; not on the day itself; not under 20 runs
  const cohort=Array.from({length:30},(_,i)=>({journal:100-i,excess:i/10}));
  assert.deepEqual(W.dayGrants('d','2026-11-18','2026-11-19',cohort,{journal:98,excess:0}).map(x=>x.rule),['top10-journal']);
  assert.deepEqual(W.dayGrants('d','2026-11-18','2026-11-19',cohort,{journal:97,excess:2.9}).map(x=>x.rule),['top10-market']);
  const tied=[...cohort.slice(3),{journal:100,excess:0},{journal:100,excess:0},{journal:100,excess:0},{journal:100,excess:0}];
  assert.equal(W.placeOf(tied.map(x=>x.journal),100),1);
  assert.equal(W.dayGrants('d','2026-11-18','2026-11-19',tied,{journal:100,excess:0}).length,1);// four tied at the top all share it
  assert.deepEqual(W.dayGrants('d','2026-11-19','2026-11-19',cohort,{journal:100,excess:3}),[]);// the day is not over
  assert.deepEqual(W.dayGrants('d','2026-11-18','2026-11-19',cohort.slice(0,19),{journal:100,excess:3}),[]);// small group
  assert.deepEqual(W.newGrants([{key:'first-clear'}],g).map(x=>x.key),['weekly-5:2026-11-16']);
  const S=await load('core/stamps');assert.ok(S.STAMPS.some(s=>s.id==='observatory-first'&&s.check({observatoryClears:1})));
});

test('several companies (levels 4·5): only the scene target is sold, every company counts toward the result', async () => {
  assert.equal(SP.serverPackOf(1).id,'sample-danpung');assert.equal(SP.serverPackOf(2).id,'sample-danpung');assert.equal(SP.serverPackOf(3).id,'sample-solbit');assert.equal(SP.serverPackOf(4).id,'sample-solbit-l4');assert.equal(SP.serverPackOf(5).id,'sample-solbit-l5');
  const L4=SP.SOLBIT_L4,L5=SP.SOLBIT_L5,B=L4.others[0];
  assert.deepEqual(M.companiesOf(L4).map(c=>[c.slot,c.alias]),[['A','솔빛산업'],['B','다온포장']]);
  for(const p of [L4,L5])for(const s of p.scenes)assert.ok(s.cards.length>=3&&s.cards.length<=5,`${p.id} ${s.id}`);
  assert.deepEqual(L5.scenes.map(M.targetOf),['A','B','A']);assert.equal(M.aliasOf(L5,'B'),'다온포장');
  // holding everything: the same as holding both all along
  const hold=[{scene:'s1',fraction:'0'},{scene:'s2',fraction:'0'},{scene:'s3',fraction:'0'}];
  assert.ok(Math.abs(M.performance(L4,hold).excess)<1e-9);
  const t0=L4.scenes[0].tick,T=L4.evalTick;
  assert.ok(Math.abs(M.performance(L4,hold).start-(L4.cash+80*M.closeOf(L4,'A',t0)+B.qty*M.closeOf(L4,'B',t0)))<1e-6);
  // level 4: every decision sells 솔빛산업; 다온포장 stays whole
  const f4=M.fillsOf(L4,[{scene:'s1',fraction:'1/2'},{scene:'s2',fraction:'0'},{scene:'s3',fraction:'0'}]);
  assert.deepEqual(f4.fills.map(f=>f.slot),['A','A','A']);assert.equal(M.fval(f4.held.A),40);assert.equal(M.fval(f4.held.B),60);
  // level 5: scene 2 judges 다온포장 — a half sale there sells 30 of its 60 at its own next open
  const f5=M.fillsOf(L5,[{scene:'s1',fraction:'0'},{scene:'s2',fraction:'1/2'},{scene:'s3',fraction:'0'}]);
  assert.equal(f5.fills[1].slot,'B');assert.equal(M.fval(f5.fills[1].sold),30);assert.equal(f5.fills[1].price,M.openOf(L5,'B',L5.scenes[1].tick+1));
  assert.equal(M.fval(f5.held.A),80);assert.equal(M.fval(M.leftAfter(L5,[{scene:'s1',fraction:'0'}],'1/4',L5.scenes[1].tick,'B')),45);
  const p5=M.performance(L5,[{scene:'s1',fraction:'0'},{scene:'s2',fraction:'1/2'},{scene:'s3',fraction:'0'}]);
  const want=f5.cash+80*M.closeOf(L5,'A',T)+30*M.closeOf(L5,'B',T);assert.ok(Math.abs(p5.end-want)<1e-6);
  // a level-5 run plays and settles like any other
  let r=M.setStage(M.startRun(L5,Q.questById('q10'),DAY,NOW,[],'m5'),'scene');
  L5.scenes.forEach((s,i)=>{r=M.setDraft(r,s.id,{hypo:'다온포장은 배당 약속을 지켰지만 협상 소식이라 신뢰를 일부만 유지한다.',reason:'배당 유지는 확정 공시다.',ev:s.cards[0].id,counter:'만약 공급사 가격이 오르면 바뀐다.',recheck:'다음 실적을 본다.'});
    r=M.setPick(r,s.id,i===1?'1/2':'0');r=M.decide(L5,r,s.id,NOW).run});
  const st=S.settle(L5,r,M.blankProgress(),DAY,NOW);assert.equal(st.run.finishedAt,NOW);assert.ok(Math.abs(st.run.result.ret-p5.ret)<1e-9);
});

test('예측력: only a price, a direction and a deadline make a prediction; checked against the close, apart from the score', async () => {
  const F=await load('core/game/daily/forecast');
  assert.deepEqual(F.forecastOf('주가가 15거래일 안에 오를 것 같다',60),{direction:'상승',horizon:15});
  assert.deepEqual(F.forecastOf('주가는 한 달 안에 떨어질 것',60),{direction:'하락',horizon:21});
  assert.deepEqual(F.forecastOf('평가일까지 주가가 오른다',20),{direction:'상승',horizon:20});
  assert.equal(F.forecastOf('신뢰가 약해졌다',60),null);// no price
  assert.equal(F.forecastOf('주가가 오를 것 같다',60),null);// no deadline
  assert.equal(F.forecastOf('주가가 3주 안에 오르거나 내릴 것',60),null);// both ways
  assert.equal(F.horizonOf('2주',60),10);assert.equal(F.horizonOf('7일',60),5);
  // the sample: scene 1 close 48,400 → scene 1 + 15 = 47,100 (down); scene 3 49,000 → evaluation 48,300 (down)
  // (a hypothesis written freely: 상급, no aid)
  const mk=(h1,h3)=>({...M.startRun(P,Q.questById('q9'),DAY,NOW,[],'f'),decisions:[{scene:'s1',fields:{...M.blankFields(),hypo:h1},fraction:'0',at:0},{scene:'s2',fields:{...M.blankFields(),hypo:'신뢰를 유지한다'},fraction:'0',at:0},{scene:'s3',fields:{...M.blankFields(),hypo:h3},fraction:'0',at:0}]});
  const j=F.judgeForecasts(P,mk('주가가 15거래일 안에 오를 것','평가일까지 주가가 하락할 것'));
  assert.deepEqual(j.items.map(i=>i.status),['miss','void','hit']);assert.deepEqual([j.n,j.k,j.void],[2,1,1]);
  assert.ok(Math.abs(j.items[0].change-(47100/48400-1)*100)<1e-9);
  assert.equal(F.judgeForecasts(P,mk('주가가 3개월 안에 오를 것','주가가 3개월 안에 오를 것')).items[2].status,'hold');// past the evaluation day
  // the server's extract (A) in the same shape; a direction without a price target is not a prediction
  assert.deepEqual(F.forecastFromExtract({target:'솔빛산업 주가',horizon:'15거래일',direction:'상승'},60),{direction:'상승',horizon:15});
  assert.equal(F.forecastFromExtract({target:'영업이익',horizon:'1개월',direction:'상승'},60),null);
  // settle carries it; the journal score and XP do not move with it
  const runs=[mk('주가가 15거래일 안에 오를 것','평가일까지 주가가 하락할 것'),mk('주가가 15거래일 안에 내릴 것','평가일까지 주가가 오를 것')].map(r=>S.settle(P,{...r,stage:'result'},M.blankProgress(),DAY,NOW).run.result);
  assert.deepEqual(runs.map(r=>r.forecast.k),[1,1]);assert.equal(runs[0].journal,runs[1].journal);
});

test('the one-sentence summary states only the settled facts (call C may only reword it)', async () => {
  const LT=await load('core/content/llm-tasks');
  const r={excess:.44,journal:80,pending:false};
  const s=S.summaryOf(r,[{label:'철학 적용',grade:3},{label:'근거 정확성',grade:1}]);
  assert.equal(s,'계속 보유보다 +0.44%p 앞섰고, 일지 점수는 80점이에요. 가장 보완할 축은 근거 정확성이에요.');
  assert.equal(S.summaryOf({excess:-1.2,journal:0,pending:true}),'계속 보유보다 −1.20%p 뒤졌고, 일지 점수는 아직 평가 중이에요.');
  assert.equal(LT.checkExplain({text:'보유했을 때보다 0.44%p 앞섰어요. 일지는 80점이에요.'},s).ok,true);
  assert.equal(LT.checkExplain({text:'보유했을 때보다 0.44%p 앞섰고 다음엔 3% 더 벌 거예요.'},s).ok,false);
});

// ── feedback F2 ──────────────────────────────────────────────────────────────────────────────────────────────────────
const intro=Q.questById('q1');
function playD(q,parts,picks=['0','0','0']){let r=M.setStage(M.startRun(DP,q,DAY,NOW,[],'d'+q.id),'scene');
  DP.scenes.forEach((s,i)=>{r=M.setPick(M.setDraft(r,s.id,parts(i,s)),s.id,picks[i]);const o=M.decide(DP,r,s.id,NOW+i);assert.ok('run' in o,JSON.stringify(o));r=o.run});return r}

test('입문 on 단풍식품: the system fills target and period, the player picks a direction and writes why — only that is scored', () => {
  const s=DP.scenes[0],f={...M.blankFields(),dir:'감소',hypo:'1+1 행사로 붙잡은 판매량이라 가격 결정력은 약하다고 봐서',target:'rev',period:'n2'};
  // the given parts stand whatever the player sends for them
  const p=M.partsOf(intro,s,f);assert.equal(p.target.label,'단풍식품의 판매량');assert.equal(p.period.label,'다음 분기 실적 발표 때');
  assert.equal(M.hypoLine(intro,s,f),'단풍식품의 판매량 · 다음 분기 실적 발표 때 · 인상 전 분기 대비 감소 — 그렇게 본 이유는 1+1 행사로 붙잡은 판매량이라 가격 결정력은 약하다고 봐서');
  assert.equal(M.ownText(intro,s,f),'감소 · 1+1 행사로 붙잡은 판매량이라 가격 결정력은 약하다고 봐서');
  // a direction alone earns nothing: the given target's words are not the player's
  const bare=J.gradeRun(DP,intro,[{scene:'p1',fields:{...M.blankFields(),dir:'증가',hypo:'.'}}]);assert.equal(bare.scenes[0].score,0);
  const said=J.gradeRun(DP,intro,[{scene:'p1',fields:f}]);assert.ok(said.scenes[0].score>0);
  // the local request is this one, on this pack
  const R=PK.packOfDay(DAY,1);assert.equal(R.id,'sample-danpung');assert.equal(PK.packOfDay(DAY,3).id,'sample-solbit');
});

test('기초 — four different days: evidence, weighing the two focus cards, choosing when, saying how the view moved', () => {
  const s=DP.scenes[0];
  // q3: the evidence must be one of the two focus cards, which point different ways
  const weigh=Q.questById('q3');assert.deepEqual(s.focus.map(id=>s.cards.find(c=>c.id===id).rel).sort(),['support','weaken']);
  for(const sc of DP.scenes)assert.notEqual(sc.cards.find(c=>c.id===sc.focus[0]).rel,sc.cards.find(c=>c.id===sc.focus[1]).rel,sc.id);
  const base={...M.blankFields(),dir:'비슷',hypo:'행사 덕분이라 비슷하다고 봐서',reason:'행사는 계획이다.'};
  assert.deepEqual(M.missingOf(weigh,{...base,ev:'f2'},s),['reason']);assert.deepEqual(M.missingOf(weigh,{...base,ev:'f3'},s),[]);
  // q4: the period is picked from the scene's list (an id not on it does not count)
  const when=Q.questById('q4');
  assert.deepEqual(M.missingOf(when,base,s),['hypo']);assert.deepEqual(M.missingOf(when,{...base,period:'zz'},s),['hypo']);
  assert.deepEqual(M.missingOf(when,{...base,period:'n2'},s),[]);assert.equal(M.ownText(when,s,{...base,period:'n2'}),'두 분기 뒤 실적 발표 때 · 비슷 · 행사 덕분이라 비슷하다고 봐서');
  // q5: from scene 2 on, how the view moved is picked too (scene 1 has nothing before it)
  const moved=Q.questById('q5');assert.deepEqual(M.missingOf(moved,base,s),[]);
  assert.deepEqual(M.missingOf(moved,base,DP.scenes[1]),['shift']);assert.deepEqual(M.missingOf(moved,{...base,shift:'수정'},DP.scenes[1]),[]);
  const r=playD(moved,(i)=>({...base,shift:i?'유지':null}));assert.deepEqual(r.decisions.map(d=>d.fields.shift),[null,'유지','유지']);
  // 중급 q6 picks the target
  const what=Q.questById('q6');assert.deepEqual(M.missingOf(what,base,s),['hypo']);assert.deepEqual(M.missingOf(what,{...base,target:'rev'},s),[]);
  // no list of what can be checked: the hypothesis is written freely even on an aided day
  const bare={...s,observe:undefined};assert.equal(M.partsOf(intro,bare,base),null);assert.deepEqual(M.missingOf(intro,{...M.blankFields(),hypo:'자유 작성'},bare),[]);
});

test('예측력 of a structured hypothesis: the announced value decides it (±flat is 비슷), apart from the score', async () => {
  const F=await load('core/game/daily/forecast');
  assert.equal(F.dirOf(-1.2,2),'비슷');assert.equal(F.dirOf(3.8,2),'증가');assert.equal(F.dirOf(-2.1,2),'감소');
  // 판매량 next quarter: −1.2% (비슷) for scenes 1·2; at scene 3 the next quarter is +3.8% (증가)
  const r=playD(intro,(i)=>({...M.blankFields(),dir:['감소','비슷','증가'][i],hypo:'판촉 때문에 그렇게 봐서'}));
  const j=F.judgeForecasts(DP,r);
  assert.deepEqual(j.items.map(i=>[i.status,i.observe.said]),[['miss','비슷'],['hit','비슷'],['hit','증가']]);
  assert.deepEqual([j.n,j.k],[3,2]);assert.equal(j.items[0].observe.label,'단풍식품의 판매량 · 다음 분기 실적 발표 때');
  const st=S.settle(DP,r,M.blankProgress(),DAY,NOW).run.result;assert.equal(st.forecast.k,2);
  // a decimal point is not where a quoted sentence ends
  const g=J.gradeRun(DP,intro,[{scene:'p3',fields:{...M.blankFields(),dir:'증가',hypo:'판매량 −1.2%로 고객이 남아서 가격 결정력이 있다고 본다'}}]);
  assert.ok(g.scenes[0].dims[0].quote.includes('−1.2%로 고객이'),g.scenes[0].dims[0].quote);
});

test('단풍식품: cards agree with the prices and with each other; the announced values reach the app only at the end', async () => {
  const pc=(a,b)=>(b/a-1)*100,[s1,s2,s3]=DP.scenes;
  assert.ok(Math.abs(pc(M.closeAt(DP,s1.tick-1),M.closeAt(DP,s1.tick))-2)<.3);// 발표 당일 +2%
  assert.ok(Math.abs(pc(DP.index[s1.tick-1],DP.index[s1.tick])-.1)<.05);// 시장 +0.1%
  assert.ok(Math.abs(pc(M.closeAt(DP,s3.tick-1),M.closeAt(DP,s3.tick))-3)<.3);// 실적 날 +3%
  assert.ok(Math.abs(pc(DP.index[s3.tick-1],DP.index[s3.tick])-.2)<.05);
  assert.ok(Math.abs((1.08*(1-.012)-1)*100-6.6)<.2);// 가격 +8%, 판매량 −1.2% → 매출 +6.6%
  assert.equal(s1.observe.actual['vol@n1'].change,-1.2);assert.ok(s3.cards.some(c=>c.fact.includes('−1.2%')));
  assert.ok(s2.tick>s1.tick+1&&s3.tick>s2.tick+1&&DP.evalTick>s3.tick+1&&DP.prices.length>DP.evalTick);
  assert.ok(DP.sample&&DP.mentor.label.includes('실제 인물이 아니에요'));
  for(const s of DP.scenes){assert.ok(s.cards.length>=3&&s.cards.length<=5);for(const id of s.focus)assert.ok(s.cards.some(c=>c.id===id));
    assert.ok(s.observe.targets.some(t=>t.id===s.observe.given.target)&&s.observe.periods.some(p=>p.id===s.observe.given.period));
    assert.ok(s.observe.targets.length>=2&&s.observe.periods.length>=2);// every aid can be played on it
    for(const t of s.observe.targets)for(const p of s.observe.periods)assert.ok(s.observe.actual[`${t.id}@${p.id}`],`${s.id} ${t.id}@${p.id}`)}
  const O=await load('core/game/daily/official');
  for(let k=0;k<3;k++)for(const s of O.sceneDto(DP,k).scenes.slice(0,k+1))assert.equal(s.observe.actual,undefined,`cut ${k}`);
  assert.ok(O.sceneDto(DP,3).scenes[0].observe.actual);
});

// ── feedback F4 ──────────────────────────────────────────────────────────────────────────────────────────────────────
test('the choices are 보유 · 1/8 · 1/4 · 1/2; 3/4 is only read back from old runs; the server takes the offered ones only', async () => {
  assert.deepEqual(M.FRACTIONS.map(f=>f.id),['0','1/8','1/4','1/2']);
  assert.equal(M.fractionLabel('3/4'),'3/4 매도');assert.equal(M.fractionLabel('1/8'),'1/8 매도');
  assert.equal(M.fval(M.leftAfter(DP,[],'1/8')),87.5);// 100 → 87.5, kept exact
  const q=M.fillsOf(DP,[{scene:'p1',fraction:'1/8'},{scene:'p2',fraction:'1/8'},{scene:'p3',fraction:'1/8'}]).qty;
  assert.deepEqual(q,{n:8575,d:128});// (7/8)³ of 100 = 34300/512
  const V=await load('core/game/daily/server');
  const sub={run:'r',quest:'q1',pack:DP.id,version:1,day:DAY,decisions:DP.scenes.map(s=>({scene:s.id,fraction:'3/4',fields:{dir:'비슷',hypo:'이유'}}))};
  assert.equal(V.verifySubmission(DP,sub,{finishedQuests:[],awards:[]},DAY,NOW).error,'fraction:p1');
});

test('the market plays between moments: before scene 1, from each decision to the next moment, on to the evaluation day', () => {
  let r=M.setStage(M.startRun(DP,intro,DAY,NOW,[],'fl'),'scene');
  assert.deepEqual(M.playBefore(DP),{from:0,to:40,at:0,next:'scene'});
  r=M.setPick(M.setDraft(r,'p1',{dir:'감소',hypo:'판촉 때문에'}),'p1','1/2');r=M.decide(DP,r,'p1',NOW).run;
  assert.deepEqual(M.playAfter(DP,r),{from:40,to:60,at:40,next:'scene'});
  r={...r,play:M.playAfter(DP,r)};r=M.playAt(r,999);assert.equal(r.play.at,60);r=M.playAt(r,-5);assert.equal(r.play.at,40);
  assert.equal(M.endPlay(r).play,undefined);
  for(const id of ['p2','p3']){r=M.setPick(M.setDraft(M.endPlay(r),id,{dir:'비슷',hypo:'판촉 때문에'}),id,'0');r=M.decide(DP,r,id,NOW).run}
  assert.deepEqual(M.playAfter(DP,r),{from:80,to:100,at:80,next:'result'});
  // the account on a day of the flow: the half sold at scene 1 fills at the next open (tick 41), not before
  const d=r.decisions,cl=t=>M.closeAt(DP,t);
  assert.equal(M.valueAt(DP,d,40),DP.cash+100*cl(40));
  const f=M.fillsOf(DP,d).fills[0];assert.equal(f.tick,41);
  assert.ok(Math.abs(M.valueAt(DP,d,41)-(f.cash+50*cl(41)))<1e-6);
  // the evaluation day's value is the result's end value
  assert.ok(Math.abs(M.valueAt(DP,d,DP.evalTick)-M.performance(DP,d).end)<1e-6);
});

test('a pack carries its market rules (the fee is its own) and its headlines; a cut shows only those out by then', async () => {
  assert.deepEqual(DP.market,{calendar:'XKRX',label:'한국 거래일 · 원화',fee:.001});
  const us={...DP,market:{calendar:'XNYS',label:'미국 거래일 · 달러',fee:.002}};
  const a=M.fillsOf(DP,[{scene:'p1',fraction:'1/2'}]).fills[0],b=M.fillsOf(us,[{scene:'p1',fraction:'1/2'}]).fills[0];
  assert.ok(Math.abs(b.fee-2*a.fee)<1e-9);
  assert.ok(DP.news.every((n,i)=>i===0||n.tick>=DP.news[i-1].tick));
  for(const n of DP.news)assert.ok(!/(매수|매도|사라|팔아|19\d\d|20\d\d)/.test(n.title),n.title);
  const O=await load('core/game/daily/official');
  for(let k=0;k<3;k++){const c=O.sceneDto(DP,k);assert.ok(c.news.every(n=>n.tick<=DP.scenes[k].tick),`cut ${k}`);assert.ok(c.news.length<DP.news.length)}
  assert.equal(O.sceneDto(DP,3).news.length,DP.news.length);
});
