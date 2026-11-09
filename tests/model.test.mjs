import test from 'node:test';
import {load} from './load-app.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const {growthOf,conditionOf,treeState,defaultRules,initial,route,ActionGate,dialogueLayout,giftPosition,subject}=await load('core/model');
const sample={...initial[0],date:'2026-10-01',lossDays:0};
test('fruit glow includes exactly +10 percent',()=>{assert.equal(treeState({...sample,rate:10},defaultRules).glowing,true);assert.equal(treeState({...sample,rate:9.9},defaultRules).glowing,false)});
test('shrink starts below -10, not at -10',()=>{assert.equal(treeState({...sample,rate:-10},defaultRules).shrunken,false);assert.equal(treeState({...sample,rate:-10.1},defaultRules).shrunken,true)});
test('old tree requires positive return and sufficient holding age',()=>{assert.equal(treeState({...sample,date:'2025-01-01',rate:1},defaultRules).old,true);assert.equal(treeState({...sample,date:'2025-01-01',rate:0},defaultRules).old,false)});
test('severe damage depends on separate sustained loss duration',()=>{assert.equal(treeState({...sample,date:'2025-01-01',rate:-24,lossDays:59},defaultRules).broken,false);assert.equal(treeState({...sample,date:'2025-01-01',rate:-20,lossDays:60},defaultRules).broken,true)});
test('recovery removes severe damage and enables growth and glow',()=>{const s=treeState({...sample,date:'2025-01-01',rate:12,lossDays:90},defaultRules);assert.equal(s.broken,false);assert.equal(s.old,true);assert.equal(s.glowing,true)});
test('four starting trees represent distinct states',()=>{const states=initial.map(h=>treeState(h,defaultRules));assert.ok(states[0].glowing);assert.ok(states[1].old);assert.ok(states[2].shrunken);assert.ok(states[3].broken)});
test('pathfinding goes around furniture with adjacent steps',()=>{const blocks=new Set(['1,0','1,1']);const path=route({x:0,y:0},{x:2,y:0},blocks);assert.ok(path);assert.equal(path.at(-1).x,2);let prev={x:0,y:0};for(const p of path){assert.ok(!blocks.has(`${p.x},${p.y}`));assert.equal(Math.abs(p.x-prev.x)+Math.abs(p.y-prev.y),1);prev=p}});
test('interaction ends beside blocked object and impossible routes fail',()=>{const blocks=new Set(['1,1']);const path=route({x:4,y:4},{x:1,y:1},blocks,true);const end=path.at(-1);assert.equal(Math.abs(end.x-1)+Math.abs(end.y-1),1);assert.equal(route({x:0,y:0},{x:3,y:3},new Set(['0,1','1,0'])),null)});

test('cancelled placement cannot commit after player arrival',()=>{const gate=new ActionGate();const old=gate.begin();gate.cancel();assert.equal(gate.complete(old),false);assert.equal(gate.active,false)});
test('a newer placement replaces the prior one and can only commit once',()=>{const gate=new ActionGate();const a=gate.begin();const b=gate.begin();assert.equal(gate.complete(a),false);assert.equal(gate.complete(b),true);assert.equal(gate.complete(b),false)});
test('dialogue choices stay beside the character and inside narrow frames',()=>{for(const w of [320,375,600,1100]){for(const x of [8,45,75,95]){const d=dialogueLayout(x,70,w,w/1.375);assert.ok(d.choiceX>=12);assert.ok(d.choiceX+d.choicesWidth<=w-12);assert.ok(d.bubbleX-d.bubbleWidth/2>=12);assert.ok(d.bubbleX+d.bubbleWidth/2<=w-12)}}});
test('uncollected visitor gifts use separate floor positions',()=>{const gifts=[{id:'a',x:6,y:7},{id:'b',x:4,y:7}];assert.deepEqual(giftPosition(gifts,[]),{x:5,y:8});assert.deepEqual(giftPosition(gifts,['a']),{x:6,y:7})});
test('Korean names use appropriate subject particle',()=>{assert.equal(subject('모아'),'모아가');assert.equal(subject('루온'),'루온이')});
test('expanded yard is walkable through its far corner and rejects outside bounds',()=>{const path=route({x:4,y:4},{x:16,y:14},new Set());assert.deepEqual(path.at(-1),{x:16,y:14});assert.equal(route({x:4,y:4},{x:17,y:14},new Set()),null)});

// 012 finer stages: growth by days held, condition by the mock return; the old thresholds stay exact
test('growth goes seed → sprout → sapling → young → grand by days held',()=>{
 const g=d=>growthOf(d,defaultRules);assert.deepEqual([0,6,7,29,30,89,90,179,180].map(g),['seed','seed','sprout','sprout','sapling','sapling','young','young','grand']);
});
test('condition: bloom from +10, dull from 0 to -10, wilt below -10, rot halfway to dead, dead at -20 for damageDays',()=>{
 const c=(rate,lossDays=0)=>conditionOf({...sample,rate,lossDays},defaultRules);
 assert.deepEqual([10,9.9,0,-0.1,-10,-10.1,-19.9].map(r=>c(r)),['bloom','well','well','dull','dull','wilt','wilt']);
 assert.equal(c(-20,29),'wilt');assert.equal(c(-20,30),'rot');assert.equal(c(-20,59),'rot');assert.equal(c(-20,60),'dead');assert.equal(c(-19.9,90),'wilt');
 assert.equal(treeState({...sample,rate:-24,lossDays:90},defaultRules).broken,true,'dead keeps the old broken flag');
 assert.equal(treeState({...sample,rate:12,lossDays:90},defaultRules).condition,'bloom','recovery shows at once');
});
