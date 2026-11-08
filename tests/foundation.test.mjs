import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import {pathToFileURL} from 'node:url';
const dir=fs.mkdtempSync(new URL('../.foundation-test-',import.meta.url));
for(const n of ['model','timing','store','interaction-mode','visitor-machine','dialogue-pages','visitor-tasks','friends','personas','content']){let code=ts.transpileModule(fs.readFileSync(new URL('../app/'+n+'.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;code=code.replace(/from ['"]\.\/(\w[\w-]*)['"]/g,'from "./$1.mjs"');fs.writeFileSync(dir+'/'+n+'.mjs',code)}
const {migrateV3,gardenReducer}=await import(pathToFileURL(dir+'/store.mjs'));const {WorldQueue,resolveMode}=await import(pathToFileURL(dir+'/interaction-mode.mjs'));const {VisitorMachine}=await import(pathToFileURL(dir+'/visitor-machine.mjs'));
process.on('exit',()=>fs.rmSync(dir,{recursive:true,force:true}));
test('v2 migration retains possessions and reasons without mutating old data',()=>{const old={holdings:[],decor:[{id:3}],records:['reason'],equipped:'여름 선글라스',claimed:['gift']};const before=JSON.stringify(old),v=migrateV3(old);assert.equal(JSON.stringify(old),before);assert.deepEqual(v.records,old.records);assert.deepEqual(v.decor,old.decor);assert.equal(v.slots.face,old.equipped);assert.equal(v.version,3);assert.equal(v.sunlight,0)});
test('old saves move friend records from list position to friend id (13.7-2)',()=>{const v=migrateV3({gifts:[{id:'visit-1',sender:1,anonymous:false,item:'x',x:1,y:1}],relationships:[{points:5,stage:1,daily:{}},{points:2,stage:0,daily:{}},{points:0,stage:0,daily:{}}]});assert.equal(v.gifts[0].sender,'tori');assert.equal(v.relationships.moa.points,5);assert.equal(v.relationships.tori.points,2);assert.deepEqual(migrateV3(v),v)});
test('v3 migration is idempotent and keeps added progress',()=>{const v=migrateV3({sunlight:42,care:{1:3}});assert.deepEqual(migrateV3(v),v)});
test('reducer updates one field without losing new state',()=>{const v=migrateV3({sunlight:42});assert.equal(gardenReducer(v,{key:'records',value:r=>[...r,'new']}).sunlight,42)});
test('modes have a single explicit precedence',()=>{assert.equal(resolveMode({panel:true,talk:true,decorating:true}),'panel');assert.equal(resolveMode({}),'free')});
test('queue expires ambient only and preserves gifts',()=>{const q=new WorldQueue();q.enqueue('ambient',()=>{},0);q.enqueue('gift',()=>{},0);assert.equal(q.take(31000).kind,'gift');assert.equal(q.take(31000),undefined)});
test('visitor pause blocks idle actions and transitions invalidate timers',()=>{const v=new VisitorMachine();v.transition('idle');const t=v.capture();v.pause();assert.equal(v.canAct,false);v.resume();assert.equal(v.canAct,true);v.transition('talking');assert.equal(v.valid(t),false);v.reset();assert.equal(v.state,'absent')});

const {splitDialogue}=await import(pathToFileURL(dir+'/dialogue-pages.mjs'));
test('dialogue pages preserve words and keep each page bounded',()=>{const text='오늘은 어떤 하루였어? 잠깐 앉아서 이야기할래? '+ '가'.repeat(100);const pages=splitDialogue(text);assert.ok(pages.every(p=>Array.from(p).length<=42));assert.equal(pages.join('').replace(/\s/g,''),text.replace(/\s/g,''))});
const clockCode=ts.transpileModule(fs.readFileSync(new URL('../app/scene/pause-clock.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
fs.writeFileSync(dir+'/pause-clock.mjs',clockCode);const {PauseClock}=await import(pathToFileURL(dir+'/pause-clock.mjs'));
test('speech hover preserves remaining duration and adds release grace',()=>{const c=new PauseClock(4000);c.start(0);c.pause(1000);assert.equal(c.left(9000),3000);c.release(9000);assert.equal(c.left(10000),3500);c.pause(10000);c.release(12000);assert.equal(c.left(13000),4000)});
test('queue coalesces departure without losing gifts',()=>{const q=new WorldQueue();q.enqueue('departure',()=>{},0);q.enqueue('gift',()=>{},1);q.enqueue('departure',()=>{},2);assert.equal(q.items.length,2);assert.equal(q.take(3).kind,'gift');assert.equal(q.take(3).kind,'departure')});

const {pickTask,taskWeights,mayTalk,stepAside,cornerCell,fleeCell,TASKS,TASK_IDS}=await import(pathToFileURL(dir+'/visitor-tasks.mjs'));
const {PERSONAS,personaOf}=await import(pathToFileURL(dir+'/personas.mjs'));
const {FRIENDS,friendById,friendIdOf}=await import(pathToFileURL(dir+'/friends.mjs'));
const {taskLine,friendLine}=await import(pathToFileURL(dir+'/content.mjs'));
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
 for(const f of FRIENDS){assert.ok(P[f.persona],f.id);for(const k of ['greet','talk','bye','farewell','busy','notice','agree'])assert.ok(f.lines[k],f.id+' '+k)}
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
 assert.equal(friendLine('tori','greet'),friendById('tori').lines.greet);
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
fs.writeFileSync(dir+'/layout.mjs',ts.transpileModule(fs.readFileSync(new URL('../app/scene/layout.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText);
const L=await import(pathToFileURL(dir+'/layout.mjs'));const {route}=await import(pathToFileURL(dir+'/model.mjs'));
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
