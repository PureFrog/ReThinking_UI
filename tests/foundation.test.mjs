import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import {pathToFileURL} from 'node:url';
const dir=fs.mkdtempSync(new URL('../.foundation-test-',import.meta.url));
for(const n of ['model','timing','store','interaction-mode','visitor-machine','dialogue-pages','visitor-rhythm']){let code=ts.transpileModule(fs.readFileSync(new URL('../app/'+n+'.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;code=code.replace(/from ['"]\.\/(\w[\w-]*)['"]/g,'from "./$1.mjs"');fs.writeFileSync(dir+'/'+n+'.mjs',code)}
const {migrateV3,gardenReducer}=await import(pathToFileURL(dir+'/store.mjs'));const {WorldQueue,resolveMode}=await import(pathToFileURL(dir+'/interaction-mode.mjs'));const {VisitorMachine}=await import(pathToFileURL(dir+'/visitor-machine.mjs'));
process.on('exit',()=>fs.rmSync(dir,{recursive:true,force:true}));
test('v2 migration retains possessions and reasons without mutating old data',()=>{const old={holdings:[],decor:[{id:3}],records:['reason'],equipped:'여름 선글라스',claimed:['gift']};const before=JSON.stringify(old),v=migrateV3(old);assert.equal(JSON.stringify(old),before);assert.deepEqual(v.records,old.records);assert.deepEqual(v.decor,old.decor);assert.equal(v.slots.face,old.equipped);assert.equal(v.version,3);assert.equal(v.sunlight,0)});
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

const {visitorAction}=await import(pathToFileURL(dir+'/visitor-rhythm.mjs'));
test('visitors settle after at most two autonomous activities, without an endless loop',()=>{
 const actions=Array.from({length:100},(_,step)=>visitorAction(step,true));
 assert.deepEqual(actions.filter(a=>a!=='rest'),['water','wander']);
 assert.equal(Array.from({length:100},(_,step)=>visitorAction(step,false)).filter(a=>a!=='rest').length,1);
});
