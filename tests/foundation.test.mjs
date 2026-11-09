import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import {pathToFileURL} from 'node:url';
import {load} from './load-app.mjs';
const {migrateV3,gardenReducer}=await load('core/store');const {WorldQueue,resolveMode}=await load('core/interaction-mode');const {VisitorMachine}=await load('core/visitor-machine');
test('v2 migration retains possessions and reasons without mutating old data',()=>{const old={holdings:[],decor:[{id:3}],records:['reason'],equipped:'여름 선글라스',claimed:['gift']};const before=JSON.stringify(old),v=migrateV3(old);assert.equal(JSON.stringify(old),before);assert.deepEqual(v.records,old.records);assert.deepEqual(v.decor,old.decor);assert.equal(v.slots.face,old.equipped);assert.equal(v.version,3);assert.equal(v.sunlight,0)});
test('old saves move friend records from list position to friend id (13.7-2)',()=>{const v=migrateV3({gifts:[{id:'visit-1',sender:1,anonymous:false,item:'x',x:1,y:1}],relationships:[{points:5,stage:1,daily:{}},{points:2,stage:0,daily:{}},{points:0,stage:0,daily:{}}]});assert.equal(v.gifts[0].sender,'tori');assert.equal(v.relationships.moa.points,5);assert.equal(v.relationships.tori.points,2);assert.deepEqual(migrateV3(v),v)});
test('v3 migration is idempotent and keeps added progress',()=>{const v=migrateV3({sunlight:42,care:{1:3}});assert.deepEqual(migrateV3(v),v)});
test('reducer updates one field without losing new state',()=>{const v=migrateV3({sunlight:42});assert.equal(gardenReducer(v,{key:'records',value:r=>[...r,'new']}).sunlight,42)});
test('modes have a single explicit precedence',()=>{assert.equal(resolveMode({panel:true,talk:true,decorating:true}),'panel');assert.equal(resolveMode({}),'free')});
test('queue expires ambient only and preserves gifts',()=>{const q=new WorldQueue();q.enqueue('ambient',()=>{},0);q.enqueue('gift',()=>{},0);assert.equal(q.take(31000).kind,'gift');assert.equal(q.take(31000),undefined)});
test('visitor pause blocks idle actions and transitions invalidate timers',()=>{const v=new VisitorMachine();v.transition('idle');const t=v.capture();v.pause();assert.equal(v.canAct,false);v.resume();assert.equal(v.canAct,true);v.transition('talking');assert.equal(v.valid(t),false);v.reset();assert.equal(v.state,'absent')});

const {splitDialogue}=await load('core/dialogue-pages');
test('dialogue pages preserve words and keep each page bounded',()=>{const text='오늘은 어떤 하루였어? 잠깐 앉아서 이야기할래? '+ '가'.repeat(100);const pages=splitDialogue(text);assert.ok(pages.every(p=>Array.from(p).length<=42));assert.equal(pages.join('').replace(/\s/g,''),text.replace(/\s/g,''))});
const {PauseClock}=await load('scene/pause-clock');
test('speech hover preserves remaining duration and adds release grace',()=>{const c=new PauseClock(4000);c.start(0);c.pause(1000);assert.equal(c.left(9000),3000);c.release(9000);assert.equal(c.left(10000),3500);c.pause(10000);c.release(12000);assert.equal(c.left(13000),4000)});
test('queue coalesces departure without losing gifts',()=>{const q=new WorldQueue();q.enqueue('departure',()=>{},0);q.enqueue('gift',()=>{},1);q.enqueue('departure',()=>{},2);assert.equal(q.items.length,2);assert.equal(q.take(3).kind,'gift');assert.equal(q.take(3).kind,'departure')});

const {pickTask,taskWeights,mayTalk,stepAside,cornerCell,fleeCell,TASKS,TASK_IDS}=await load('core/visitor-tasks');
const {PERSONAS,personaOf}=await load('content/personas');
const {FRIENDS,friendById,friendIdOf}=await load('content/friends');
const {taskLine,friendLine}=await load('content/content');
const seq=(...v)=>{let i=0;return ()=>v[i++%v.length]};
// Example kinds of friends the user named (13.7-2). Not shipped: they show the persona fields can carry such characters.
const base={near:'face',pace:1,rest:1,linger:1,lineGap:40000,lineChance:.35};
const EXAMPLES={
 roamer:{...base,label:'돌아다니기',pace:.6,rest:.5,linger:.7,weights:{roam:8,chase:5,flowers:2,look:3,stretch:1,follow:1}},
 shy:{...base,label:'숨기',near:'shy',pace:1.1,lineChance:.15,opening:'hide',weights:{hide:8,window:2,read:2,watch:1,flowers:1}},
 gardener:{...base,label:'물 주기',opening:'water',openingRepeat:true,tends:true,weights:{water:10,flowers:4,look:1,stretch:1,watch:1}},
 chatty:{...base,label:'수다',near:'approach',lineGap:20000,lineChance:1,weights:{chat:8,follow:6,sofa:2,flowers:1,look:2}},
 sleepy:{...base,label:'잠꾸러기',pace:1.4,rest:1.5,linger:3,lineChance:.2,opening:'nap',repeatable:['nap'],weights:{nap:10,sofa:4,stretch:1,window:1}},
};
const P={...PERSONAS,...EXAMPLES};
test('friends pick tasks, never one of the last three (11.15-7)',()=>{
 for(const id of ['gentle','lively','quiet']){const recent=[];for(let i=0;i<200;i++){const t=pickTask(P[id],{recent,dryTree:true,newThing:false});assert.ok(!recent.slice(-3).includes(t),id+' '+t);recent.push(t)}assert.ok(new Set(recent).size>=6,id)}
});
test('the three friends keep their personalities, and situation shapes the weights (11.15-3, 11.15-4)',()=>{
 const base={recent:[],dryTree:false,newThing:false};const [moa,tori,luon]=['moa','tori','luon'].map(id=>personaOf(friendById(id).persona));
 assert.equal(taskWeights(moa,base).water,0);assert.equal(taskWeights(moa,base).look,0);
 assert.ok(taskWeights(tori,{...base,dryTree:true}).water>taskWeights(tori,base).sofa*10);
 assert.ok(taskWeights(moa,{...base,newThing:true}).look>taskWeights(moa,base).follow*3);
 assert.ok(taskWeights(moa,base).follow>taskWeights(luon,base).follow);assert.ok(taskWeights(luon,base).nap>taskWeights(tori,base).nap);
 assert.ok(taskWeights(moa,{...base,closeness:1}).follow>taskWeights(moa,base).follow);
 const n=taskWeights(tori,{...base,night:true});assert.ok(n.nap>n.chase);
 assert.equal(pickTask(tori,{recent:[],dryTree:true,newThing:false},seq(.99)),'tea');
});
test('every preset is complete and every task has a default line (13.7-2)',()=>{
 for(const [id,p] of Object.entries(P)){assert.ok(p.label&&p.pace>0&&p.rest>0&&p.linger>0&&p.lineGap>=20000,id);assert.ok(Object.values(p.weights).some(v=>v>0),id);for(const k of Object.keys(p.weights))assert.ok(TASK_IDS.includes(k),id+' '+k)}
 for(const k of TASK_IDS)assert.ok(TASKS[k].line,k);
 for(const f of FRIENDS){assert.ok(P[f.persona],f.id);for(const k of ['greet','talk','bye','farewell','busy','notice','agree','cheer'])assert.ok(friendLine(f.id,k),f.id+' '+k)}
});
test('new kinds of friends behave by persona (13.7-2)',()=>{
 const base={recent:[],dryTree:true,newThing:false};const top=p=>{const w=taskWeights(p,base);return Object.entries(w).sort((a,b)=>b[1]-a[1])[0][0]};
 assert.equal(top(P.roamer),'roam');assert.equal(top(P.shy),'hide');assert.equal(top(P.gardener),'water');assert.equal(top(P.chatty),'chat');assert.equal(top(P.sleepy),'nap');
 // a sleepy friend may keep napping; nobody else repeats
 assert.ok(taskWeights(P.sleepy,{...base,recent:['nap','nap','nap']}).nap>0);assert.equal(taskWeights(P.gentle,{...base,recent:['sofa']}).sofa,0);
 assert.equal(P.gardener.opening,'water');assert.equal(P.sleepy.opening,'nap');assert.equal(P.shy.near,'shy');assert.equal(P.chatty.near,'approach');
 assert.ok(P.roamer.pace<1&&P.sleepy.pace>1&&P.sleepy.linger>1);
});
test('lines stay at least the gap apart; a chatty persona may talk at 20 s (11.15-6, 13.7-3)',()=>{
 assert.equal(mayTalk(10000,0,40000,()=>0),false);assert.equal(mayTalk(40000,0,40000,()=>0),true);
 assert.equal(mayTalk(0,undefined,40000,()=>0),true);assert.equal(mayTalk(90000,0,40000,()=>.9),false);
 for(const [id,p] of Object.entries(PERSONAS))assert.equal(p.lineGap,40000,id);
 assert.equal(mayTalk(25000,0,P.chatty.lineGap,()=>.99,P.chatty.lineChance),true);
});
test('lines come from the friend, then the persona, then the task (13.7-9 provider)',()=>{
 assert.equal(taskLine('moa','sofa'),'여기 앉으니까 포근하다.');assert.equal(taskLine('moa','hide'),TASKS.hide.line);
 assert.equal(friendLine('tori','greet'),'왔데이! 정원 구경 좀 해도 되나? 오늘 햇살 참 좋다!');
});
test('friends are found by id; old saves by position still resolve',()=>{
 assert.equal(friendById('luon').name,'루온');assert.equal(friendIdOf(1),'tori');assert.equal(friendIdOf('moa'),'moa');assert.equal(friendIdOf('nobody'),FRIENDS[0].id);
});
test('hiding spots are sheltered and away from the player; backing off moves away',()=>{
 const cells=[];for(let x=0;x<=6;x++)for(let y=0;y<=6;y++)cells.push({x,y});const free=c=>c.x>=0&&c.x<=6&&c.y>=0&&c.y<=6;
 const c=cornerCell(cells,free,{x:0,y:0});assert.deepEqual(c,{x:6,y:6});
 const f=fleeCell({x:3,y:3},{x:2,y:3},cells,free);assert.ok(f&&Math.abs(f.x-2)+Math.abs(f.y-3)>1);
});
test('a friend in the way steps to a free cell off the path (11.15-5)',()=>{
 const path=[{x:3,y:3},{x:4,y:3},{x:5,y:3}];
 const c=stepAside({x:4,y:3},path,c=>c.x>=0);assert.ok(c&&!path.some(p=>p.x===c.x&&p.y===c.y));
 assert.equal(stepAside({x:4,y:3},path,()=>false),null);
});

// 13.7-5/6 space: furniture and the farm fence block cells, and furniture draws in front of whoever is behind it
const L=await load('scene/layout');const {route}=await load('core/model');
const blockedAll=()=>{const b=new Set([...L.BLOCKED_CELLS,...L.FENCE_CELLS]);for(const w of L.PARTITIONS)for(let y=w.y0;y<=w.y1;y++)if(y<w.door[0]||y>w.door[1])b.add(`${w.x},${y}`);for(let i=0;i<L.PLOT_COUNT;i++){const p=L.plotCell(i);b.add(`${p.x},${p.y}`)}return b};
test('the 009 layout: furniture and stairs block their cells, and every spot to use a piece is reachable',()=>{const b=blockedAll();
 for(const p of L.HOUSE_PLAN.filter(p=>p.blocks))for(const k of L.pieceCells(p))assert.ok(b.has(k),`${p.art} ${k}`);
 assert.ok(!b.has('1,1')&&!b.has('42,3'),'rugs are walked on');
 for(const f of [1,2]){const s=L.STAIR_CELLS[f];for(let y=s.y0;y<=s.y1;y++)assert.ok(b.has(`${s.x},${y}`),`stairs ${f}`);assert.ok(!b.has(`${L.STAIRS[f].x},${L.STAIRS[f].y}`),`landing ${f}`)}
 // the spots game.ts walks to: sofa, journal, bookcase, drawer, kitchen, bed, study desk, the stairs' foot
 const door=L.FRONT_DOOR.outside;for(const c of [{x:1,y:1},L.JOURNAL_SPOT,{x:3,y:1},{x:6,y:1},{x:10,y:1},L.STAIRS[1]])assert.ok(route(door,c,b,false,L.walkable,L.throughWall),`${c.x},${c.y}`);
 for(const c of [{x:42,y:1},{x:52,y:1}])assert.ok(route(L.STAIRS[2],c,b,false,L.walkable,L.throughWall),`${c.x},${c.y}`);
 // every free cell of each floor joins up, so nobody gets shut in behind furniture
 // the attic (017): ladder and hatch block their cells, the standing cells are free and on the right floors
 for(const k of [`${L.LADDER.x},${L.LADDER.y}`,`${L.HATCH.x},${L.HATCH.y}`])assert.ok(b.has(k),k);for(const f of [2,3])assert.ok(!b.has(`${L.ATTIC_LINK[f].x},${L.ATTIC_LINK[f].y}`)&&L.floorOf(L.ATTIC_LINK[f])===f);
 assert.deepEqual([L.nextFloor(1,3),L.nextFloor(2,3),L.nextFloor(3,1),L.nextFloor(2,1)],[2,3,2,1]);assert.deepEqual(L.exitTo(2,3),L.ATTIC_LINK[2]);assert.deepEqual(L.exitTo(3,2),L.ATTIC_LINK[3]);assert.deepEqual(L.exitTo(2,1),L.STAIRS[2]);
 for(const f of [1,2,3]){const H=L.HOUSE[f];const free=[];for(let x=H.x0;x<=H.x1;x++)for(let y=H.y0;y<=H.y1;y++)if(!b.has(`${x},${y}`))free.push({x,y});const from=f===1?L.FRONT_DOOR.inside:f===2?L.STAIRS[2]:L.ATTIC_LINK[3];for(const c of free)assert.ok(c.x===from.x&&c.y===from.y||route(from,c,b,false,L.walkable,L.throughWall),`floor ${f} ${c.x},${c.y}`)}});
test('the house has walls on every side: in and out only through the front door',()=>{const b=blockedAll();const p=route({x:4,y:4},{x:5,y:12},b,false,L.walkable,L.throughWall);assert.ok(p);const i=p.findIndex(c=>c.x===L.FRONT_DOOR.outside.x&&c.y===L.FRONT_DOOR.outside.y);assert.ok(i>0&&p[i-1].x===L.FRONT_DOOR.inside.x&&p[i-1].y===L.FRONT_DOOR.inside.y,'leaves by the door');
 assert.equal(route({x:14,y:3},{x:15,y:3},b,false,L.walkable,L.throughWall).length>1,true,'no stepping through the side wall');
 const shut=new Set([...b,`${L.FRONT_DOOR.outside.x},${L.FRONT_DOOR.outside.y}`]);assert.equal(route({x:4,y:4},{x:5,y:12},shut,false,L.walkable,L.throughWall),null)});
test('the farm is entered only through the gate',()=>{const b=blockedAll();const gate=`${L.FARM_GATE.x},${L.FARM_GATE.y}`;assert.ok(!b.has(gate));
 const path=route({x:6,y:10},{x:14,y:19},b,false,L.walkable);assert.ok(path);assert.ok(path.some(c=>`${c.x},${c.y}`===gate),'goes through the gate');
 const shut=new Set([...b,gate]);assert.equal(route({x:6,y:10},{x:14,y:19},shut,false,L.walkable),null)});
test('a long piece draws over people behind it and under people in front of it',()=>{const y=(x,yy)=>235+(x+yy)*21.5-(L.insideHouse(x,yy)?15:0);
 const sink=L.footDepth(11,0,12,0);for(const x of [11,12])assert.ok(y(x,1)>sink,`in front at ${x},1`);
 const table=L.footDepth(12,4,13,4);for(const c of [[12,5],[13,5],[14,4]])assert.ok(y(...c)>table);for(const c of [[12,3],[13,3],[11,4]])assert.ok(y(...c)<table);
 const bed=L.footDepth(40,0,41,1);for(const c of [[42,0],[42,1],[40,2],[41,2]])assert.ok(y(...c)>bed)});

// ux-spec 3장 relationships: five stages per friend, a daily cap, the retrospective outside it, each scene once
const RL=await load('core/relationships');
const {pickLine,sceneLines,friendLetter,DIALOGUE}=await load('content/content');
test('closeness climbs five stages, capped per day, with a run of visit days paying more',()=>{
 assert.deepEqual(RL.STAGES,['처음 만남','아는 사이','친구','단짝','가족 같은']);
 let r=RL.gain(undefined,5,'2026-11-01');assert.equal(r.rel.points,5);assert.equal(r.rose,null);
 r=RL.gain(r.rel,5,'2026-11-01');assert.equal(r.rel.points,RL.DAILY_CAP,'the cap stops the same day');
 r=RL.gain(r.rel,3,'2026-11-02');assert.equal(r.rel.points,RL.DAILY_CAP+3);assert.equal(r.rose,1,'a stage reached is reported once');
 assert.equal(RL.gain(r.rel,1,'2026-11-02').rose,null);
 const free=RL.gain(r.rel,20,'2026-11-02',false);assert.equal(free.rel.points,r.rel.points+20,'the retrospective is outside the cap');assert.equal(free.rose,2);
 for(const [p,s] of [[0,0],[7,0],[8,1],[25,2],[50,3],[89,3],[90,4],[500,4]])assert.equal(RL.stageOf(p),s,String(p));
 let v=RL.visitGain(undefined,'2026-11-01');assert.equal(v.rel.points,RL.POINTS.visit);assert.equal(RL.visitGain(v.rel,'2026-11-01').rel,v.rel,'the second visit of a day pays nothing');
 v=RL.visitGain(v.rel,'2026-11-02');assert.equal(v.rel.points,RL.POINTS.visit*2+RL.POINTS.streak);assert.equal(v.rel.streak,2);
 assert.equal(RL.visitGain(v.rel,'2026-11-05').rel.streak,1,'a gap starts the run again');
});
test('each stage scene plays once, lowest first',()=>{
 let r={points:60,stage:3,daily:{}};assert.equal(RL.pendingScene(r),1);r=RL.markScene(r,1);r=RL.markScene(r,2);assert.equal(RL.pendingScene(r),3);
 r=RL.markScene(r,3);assert.equal(RL.pendingScene(r),null);assert.ok(RL.sceneSeen(r,RL.LUON_REVEAL));assert.equal(RL.pendingScene({points:0,stage:0,daily:{}}),null);
 assert.equal(RL.closeness(r),.75);
});
test('lines follow stage, placed furniture and priority, and the same one does not come twice in a row',()=>{
 const opts=[{text:'a'},{text:'b',minStage:2,priority:1},{text:'c',minStage:3,priority:2},{text:'d',placed:'포근한 담요',priority:5}];
 assert.equal(pickLine(opts,{stage:0,placed:[]}),'a');assert.equal(pickLine(opts,{stage:2,placed:[]}),'b');assert.equal(pickLine(opts,{stage:3,placed:[]}),'c');
 assert.equal(pickLine(opts,{stage:0,placed:['포근한 담요']}),'d');
 assert.equal(pickLine(opts,{stage:3,placed:[]},['c']),'b','the newest said is skipped');
 assert.equal(pickLine(opts,{stage:2,placed:[]},['b','a']),'a','all said lately: the one said longest ago');
 assert.equal(pickLine([{text:'x',maxStage:1}],{stage:2,placed:[]}),undefined);
});
test('every friend has its four stage scenes, its secret, and never talks trades or prices (3장 대화 금기)',()=>{
 const all=[];for(const f of FRIENDS){const b=DIALOGUE[f.id];assert.ok(b,f.id);
  for(const s of [1,2,3,4]){const l=sceneLines(f.id,s);assert.ok(l.length>=2&&l.length<=4,f.id+' scene '+s);all.push(...l)}
  for(const ls of [...Object.values(b.lines),...Object.values(b.tasks),...Object.values(b.memory??{}),...Object.values(b.gifts??{})])for(const l of ls)all.push(l.text);all.push(...(b.letter??[]))}
 for(const t of all)assert.doesNotMatch(t,/팔아|사라|사 둬|계속 들고|오를 거|떨어질 거|매수|매도|목표가|수익/,t);
 for(const t of [...[...Object.values(DIALOGUE.luon.lines),...Object.values(DIALOGUE.luon.memory),...Object.values(DIALOGUE.luon.gifts)].flat().map(l=>l.text),...[1,2,3,4].flatMap(s=>sceneLines('luon',s))])assert.ok((t.match(/[.!?…](?=\s|$)/g)??[]).length<=2,'luon: two sentences at most · '+t);
 assert.match(sceneLines('luon',RL.LUON_REVEAL).join(' '),/담요|별 조명/,'luon owns up to the anonymous gifts');
 assert.match(sceneLines('tori',3).join(' '),/도토리/,'tori tells the acorn story');
 assert.ok(friendLetter('moa').length>=3,'moa\'s letter');assert.match(friendLetter('moa')[0],/울 것 같아서/);
});

// ux-spec 3장 memory: each greeting may bring up one remembered thing, once, in a fixed order; templates fill particles
const M=await load('core/memory');const {memoryLine,greetLine,giftLine,setLineContext}=await load('content/content');
test('memory picks one untold thing in order, and templates fill names with the right particle',()=>{
 const facts={today:'2026-11-20',lastVisit:'2026-11-09',holding:{item:'털실 바구니',day:'2026-11-09'},decor:{id:7,name:'들꽃 화병'},outfit:['산책 목도리'],decision:{tree:'새봄반도체',decision:'수정',reason:'신규 계약이 나올 거라 봐',day:'2026-11-08'}};
 const all=['absence','holding','loss','mine','decor','outfit','decision'];
 assert.equal(M.memoryTopic(facts,[],all).kind,'absence','a long absence comes first');
 assert.equal(M.memoryTopic({...facts,lastVisit:'2026-11-18'},[],all).kind,'holding','two days away is not long');
 assert.equal(M.memoryTopic(facts,['absence:2026-11-20','holding:털실 바구니:2026-11-09'],all).kind,'decor','what was told is not told again');
 assert.equal(M.memoryTopic(facts,[],['decision']).vars.day,'11월 8일');
 assert.equal(M.memoryTopic({...facts,decision:{...facts.decision,day:'2026-11-20'}},[],['decision']),null,'a decision of today is not a memory yet');
 assert.equal(M.memoryTopic({today:'2026-11-20'},[],all),null);
 assert.equal(M.fill('{item|을} 줬어',{item:'털실 바구니'}),'털실 바구니를 줬어');assert.equal(M.fill('{item|이} 있네',{item:'들꽃 화병'}),'들꽃 화병이 있네');
 assert.equal(M.fill('{decision|으로}',{decision:'수정'}),'수정으로');assert.equal(M.fill('{decision|으로}',{decision:'유보'}),'유보로');assert.equal(M.fill('{x|으로}',{x:'별'}),'별로','ㄹ takes 로');
 assert.equal(M.fill('"{reason}"',{reason:''}),'','a missing value drops the template');
 assert.equal(M.remember(Array.from({length:M.TOLD_KEEP},(_,i)=>'k'+i),'new').length,M.TOLD_KEEP);
});
test('a friend greets with what it remembers once, then says hello as usual',()=>{
 const told=[];setLineContext({stages:{moa:0,tori:0,luon:0},placed:[],memory:{moa:{today:'2026-11-20',lastVisit:'2026-11-01'},tori:{today:'2026-11-20',loss:{id:3,tree:'꽃빛뷰티'}}},told:{}},(id,k)=>told.push(id+'|'+k));
 assert.equal(memoryLine('moa'),'19일 만이네. 오랜만이야, 보고 싶었어.');assert.deepEqual(told,['moa|absence:2026-11-20']);
 assert.equal(memoryLine('moa'),'','told once');assert.equal(greetLine('moa'),friendLine('moa','greet'));
 assert.equal(memoryLine('tori'),'','only moa worries about a tree in a loss');
 setLineContext({stages:{},placed:[],memory:{moa:{today:'2026-11-20',loss:{id:3,tree:'꽃빛뷰티'}}},told:{}});assert.match(memoryLine('moa'),/꽃빛뷰티 나무가 힘들어 보여서 먼저/);
 assert.match(giftLine('moa','loved','들꽃 화병'),/들꽃 화병을 나한테/);assert.match(giftLine('tori','returned','x'),/내가 준/);
 setLineContext({stages:{},placed:[],memory:{},told:{}});
});
// ux-spec 3장 gifts both ways
const G=await load('core/gifts');
test('a friend brings one gift a day: its first, then what each stage opens, then what it brings again',()=>{
 const box=(id,item,day,sender='moa')=>({id,sender,anonymous:false,item,x:0,y:0,day});
 assert.deepEqual(G.visitGift('moa',0,[],'2026-11-01'),{id:'visit-moa',item:'위로 사탕'},'the first keeps its old id');
 let gifts=[box('visit-moa','위로 사탕','2026-11-01')];
 assert.equal(G.visitGift('moa',4,gifts,'2026-11-01'),null,'one a day');
 assert.deepEqual(G.visitGift('moa',0,gifts,'2026-11-02'),{id:'visit-moa-2026-11-02',item:'위로 사탕'},'a candy again while nothing new is open');
 assert.equal(G.visitGift('moa',2,gifts,'2026-11-02').item,'산딸기 잼','a stage opens a new one, lowest first');
 gifts=[...gifts,box('visit-moa-2026-10-30','위로 사탕','2026-10-30'),box('visit-moa-2026-11-02','산딸기 잼','2026-11-02'),box('visit-moa-2026-11-03','털실 바구니','2026-11-03'),box('visit-moa-2026-11-04','말린 꽃 액자','2026-11-04')];
 assert.equal(G.visitGift('moa',4,gifts,'2026-11-05').item,'산딸기 잼','everything given: the again one given least');
 assert.equal(G.visitGift('moa',4,[box('visit-moa','위로 사탕',undefined)],'2026-11-05').id,'visit-moa-2026-11-05','an old save without a day');
 const tori=[box('visit-tori','여름 선글라스','2026-11-01','tori')];assert.equal(G.visitGift('tori',0,tori,'2026-11-02'),null,'nothing to bring again');
 assert.equal(G.visitGift('nobody',0,[],'2026-11-02'),null);
});
test('a gift lands loved, thanked or awkward; the friend has it from the next visit on',()=>{
 const g=(item,sender)=>({id:item,sender,anonymous:false,item,x:0,y:0});
 assert.deepEqual(G.reactionTo('moa',g('들꽃 화병','tori')),{reaction:'loved',returned:false});
 assert.deepEqual(G.reactionTo('tori',g('털실 바구니','moa')),{reaction:'thanks',returned:false});
 assert.deepEqual(G.reactionTo('tori',g('들꽃 화병','tori')),{reaction:'awkward',returned:true},'its own gift back');
 assert.equal(G.reactionTo('luon',g('여름 선글라스','tori')).reaction,'awkward');
 assert.ok(G.GIFT_POINTS.loved>G.GIFT_POINTS.thanks&&G.GIFT_POINTS.thanks>G.GIFT_POINTS.awkward);
 const given=[{giftId:'a',to:'moa',item:'산딸기 잼',day:'2026-11-01',reaction:'thanks',visit:3},{giftId:'b',to:'moa',item:'들꽃 화병',day:'2026-11-02',reaction:'loved',visit:5}];
 assert.equal(G.holding(given,'moa',3),null,'not on the visit it was given');assert.equal(G.holding(given,'moa',4),'산딸기 잼');assert.equal(G.holding(given,'moa',6),'들꽃 화병','the latest');assert.equal(G.holding(given,'tori',9),null);
 for(const [id,pool] of Object.entries(G.GIFT_POOL))for(const p of pool)assert.ok(p.item,id);
});

// ux-spec 11.9 placing furniture: the first reason it does not fit, said by the player
const DC=await load('core/decorate');
test('a piece fits only where it may go, with the reason when it does not; pieces are for using',()=>{
 const ok={walkable:true,locked:false,taken:false,someone:false,inside:true,routesOpen:true,count:0};
 assert.equal(DC.placementProblem('화분',ok),null);
 assert.equal(DC.placementProblem('화분',{...ok,walkable:false}),'wall');
 assert.equal(DC.placementProblem('화분',{...ok,inside:false,locked:true}),'locked');
 assert.equal(DC.placementProblem('작은 별 조명',{...ok,inside:false}),'outside','a lamp stays indoors');
 assert.equal(DC.placementProblem('화분',{...ok,inside:false}),null,'a pot goes anywhere');
 assert.equal(DC.placementProblem('화분',{...ok,taken:true,someone:true}),'taken');
 assert.equal(DC.placementProblem('화분',{...ok,someone:true}),'someone');
 assert.equal(DC.placementProblem('화분',{...ok,count:DC.LIMITS.in}),'full');assert.equal(DC.placementProblem('화분',{...ok,inside:false,count:DC.LIMITS.in}),null,'the yard holds more');
 assert.equal(DC.placementProblem('화분',{...ok,routesOpen:false}),'path');assert.equal(DC.placementProblem('러그',{...ok,routesOpen:false}),null,'a rug lets people pass');
 for(const p of Object.keys(DC.PROBLEM_LINES))assert.ok(DC.PROBLEM_LINES[p].length>2);
 assert.equal(DC.ruleOf('작은 별 조명').use,'light');assert.ok(DC.ruleOf('들꽃 화병').line);assert.equal(DC.ruleOf('없는 가구').use,'look');
});
test('a long piece covers its cells (the other way once turned), and fits only where every cell does',()=>{
 assert.deepEqual(DC.footprint({name:'나무 벤치',x:3,y:12}),[{x:3,y:12},{x:4,y:12}]);
 assert.deepEqual(DC.footprint({name:'나무 벤치',x:3,y:12,flip:true}),[{x:3,y:12},{x:3,y:13}]);
 assert.deepEqual(DC.footprint({name:'화분',x:1,y:2,flip:true}),[{x:1,y:2}]);
 const ok={walkable:true,locked:false,taken:false,someone:false,inside:false,routesOpen:true,count:0};
 assert.equal(DC.footprintProblem('나무 벤치',[ok,ok]),null);assert.equal(DC.footprintProblem('나무 벤치',[ok,{...ok,taken:true}]),'taken');
 assert.equal(DC.footprintProblem('나무 벤치',[{...ok,inside:true},ok]),'inside','a bench stays in the yard');
 for(const n of ['쿠션','나무 벤치','작은 독서 의자'])assert.equal(DC.ruleOf(n).use,'sit');
});
test('house surfaces: a room floor or wall at a time, yard tiles one cell each, the first style takes it back',()=>{
 let s={};s=DC.paint(s,'floor','check','living');assert.deepEqual(s.floor,{living:'check'});
 s=DC.paint(s,'wall','stripe','kitchen');assert.deepEqual(s.wall,{kitchen:'stripe'});
 s=DC.paint(s,'tile','path','3,9');s=DC.paint(s,'tile','flower','3,11');assert.deepEqual(s.tiles,{'3,9':'path','3,11':'flower'});
 s=DC.paint(s,'tile','grass','3,9');assert.deepEqual(s.tiles,{'3,11':'flower'},'grass lifts a tile');
 s=DC.paint(s,'floor',DC.FLOOR_STYLES[0].id,'living');assert.deepEqual(s.floor,{},'the house picture again');
 for(const list of [DC.FLOOR_STYLES,DC.WALL_STYLES])assert.equal(list[0].colors.length,0,'the first style is the picture as drawn');
 s=DC.withExterior(s,'rose');assert.equal(s.exterior,'rose');assert.equal(DC.withExterior(s,DC.EXTERIOR_STYLES[0].id).exterior,undefined,'the outside as drawn');
 for(const l of Object.values(DC.SURFACE_LINES))assert.ok(l.endsWith('.'));
});
test('7장 settings: an old save starts with sound not yet asked and calm off; partial sound settings are filled in',()=>{
 const v=migrateV3({settings:{autoAdvance:true}});assert.equal(v.settings.autoAdvance,true);assert.equal(v.settings.sound.on,null,'asked once, on the first press');assert.equal(v.settings.reduceMotion,false);
 const w=migrateV3({settings:{sound:{on:true,voice:.3}}});assert.deepEqual(w.settings.sound,{on:true,sfx:.7,voice:.3,music:.5});
});
test('sound map: docs/sound-map.md and the SLOTS in app/core/sound.ts list the same places',async()=>{
 const {SLOTS,EVENT_SLOTS}=await load('core/sound');
 const doc=fs.readFileSync(new URL('../docs/sound-map.md',import.meta.url),'utf8');
 const listed=[...doc.matchAll(/^\| `([a-z-]+)` \|/gm)].map(m=>m[1]);
 assert.deepEqual([...listed].sort(),Object.keys(SLOTS).sort());
 for(const s of Object.values(EVENT_SLOTS))assert.ok(s in SLOTS,s);
});
