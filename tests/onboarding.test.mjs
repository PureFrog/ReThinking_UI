import test from 'node:test';
import {load} from './load-app.mjs';
import assert from 'node:assert/strict';
const {drafts,applyDrafts,HELD}=await load('core/portfolio');
const {startStep,nextStep}=await load('core/onboarding');
const {MOCK_CAPTURE,kindOf,COMPANY_KINDS}=await load('content/portfolio');
const {migrateV3}=await load('core/store');
const {DIALOGUE,onboardLine}=await load('content/content');
const {heldDays}=await load('core/model');
const tree=(id,name,rate,plot)=>({id,name,kind:0,price:1000,quantity:1,date:'2026-08-01',rate,plot,lossDays:rate<=-20?40:0});

// ux-spec 8장: a capture becomes trees
test('a first capture: every line becomes a tree on the free plots, sized by how long it was held',()=>{
 const {rows,missing}=drafts(MOCK_CAPTURE,[]);assert.equal(rows.length,4);assert.deepEqual(missing,[]);
 rows[2].held='half';rows[3].keep=false;
 const r=applyDrafts([],rows,[],[0,1,2,5],kindOf,1000);
 assert.deepEqual(r.planted.map(h=>[h.name,h.plot]),[['새봄반도체',0],['별숲게임즈',1],['꽃빛뷰티',2]]);
 assert.equal(heldDays(r.planted[2].date),HELD.find(h=>h.id==='half').days,'held time is the tree size');
 assert.equal(r.planted[0].kind,COMPANY_KINDS['새봄반도체']);assert.ok([0,1,2].includes(kindOf('처음보는회사')));
 assert.equal(r.planted[2].rate,-13);
});
test('a later capture: same names take the new rate, new names are planted, missing ones only go when said',()=>{
 const holdings=[tree(1,'새봄반도체',3,0),tree(2,'달빛스튜디오',-30,1),tree(9,'푸른칩테크',-2,4)];
 const {rows,missing}=drafts([...MOCK_CAPTURE,{name:' 새봄반도체 ',rate:1}],holdings);
 assert.equal(rows.length,4,'a name read twice counts once');assert.deepEqual(missing.map(h=>h.name),['푸른칩테크']);
 assert.equal(rows.find(r=>r.name==='새봄반도체').existing,1);
 const kept=applyDrafts(holdings,rows,[],[2,3],kindOf);assert.equal(kept.holdings.length,5,'not gone unless the player says so');
 const r=applyDrafts(holdings,rows,[9],[2,3,4],kindOf);
 assert.equal(r.holdings.find(h=>h.id===1).rate,12.4);assert.equal(r.updated,2);
 assert.equal(r.holdings.find(h=>h.id===2).lossDays,40,'a deep loss that goes on keeps its days');
 assert.deepEqual(r.gone.map(h=>h.name),['푸른칩테크']);assert.equal(r.planted.length,2);
 const full=applyDrafts(holdings,rows,[],[],kindOf);assert.deepEqual(full.left.map(d=>d.name),['별숲게임즈','꽃빛뷰티'],'no plot left: said, not planted');
});
test('onboarding steps move on by doing; a save from before skips it; a new player starts with empty plots',()=>{
 assert.equal(startStep({}),'name');assert.equal(startStep({onboarded:true}),'done');assert.equal(startStep({onboard:'water'}),'water');
 assert.equal(nextStep('name',{name:'  ',trees:0,journalClosed:false}),'name');assert.equal(nextStep('name',{name:'하늘',trees:0,journalClosed:false}),'capture');
 assert.equal(nextStep('capture',{name:'',trees:0,journalClosed:false}),'capture');assert.equal(nextStep('capture',{name:'',trees:3,journalClosed:false}),'water');
 assert.equal(nextStep('water',{name:'',trees:3,journalClosed:true}),'bye');
 const fresh=migrateV3(null);assert.deepEqual(fresh.holdings,[]);assert.equal(fresh.onboarded,false);
 const old=migrateV3({journal:[]});assert.equal(old.holdings.length,4);assert.equal(old.onboarded,true);
});
test("moa's round lines exist, name the tree, and carry no advice",()=>{
 for(const k of ['welcome','capture','water','bye'])assert.ok(DIALOGUE.moa.onboard[k],k);
 assert.ok(onboardLine('moa','water','꽃빛뷰티').includes('꽃빛뷰티'));
 for(const t of Object.values(DIALOGUE.moa.onboard))assert.doesNotMatch(t,/팔아|사라|매수|매도|수익|오를|떨어질/);
});

// ux-spec 8장 reading settings
const {setTypeSpeed,typeScale,TYPE_SPEEDS,TEXT_SIZES}=await load('core/reading');
test('typing speed: slow stretches the pauses, at once shows the whole line, unknown falls back to normal',()=>{
 setTypeSpeed('slow');assert.ok(typeScale()>1);setTypeSpeed('instant');assert.equal(typeScale(),0);setTypeSpeed(undefined);assert.equal(typeScale(),1);
 assert.deepEqual(TEXT_SIZES.map(t=>t.id),['small','normal','large']);assert.equal(TYPE_SPEEDS.length,3);
});
