// 일지 캡슐 (core/jigi/capsule.ts, 피드백 C): a draft or a journal with nothing to grade is a record; a hypothesis waiting
// for its end date seals the capsule for the days left; stars are the share that came true.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const C=await load('core/jigi/capsule');
const j=(o={})=>({id:'j',status:'saved',hypos:[],f:{},stock:{code:'005930',name:'삼성전자'},reflection:null,...o});
test('record, sealed with the days left', () => {
  assert.deepEqual(C.capsuleOf(j({status:'draft'}),'2026-11-26'),{k:'record'});
  assert.deepEqual(C.capsuleOf(j(),'2026-11-26'),{k:'record'});
  const h={id:'h',status:'confirmed',auto:true,dir:'상승',domain:'주가',form:'방향',endDate:'2026-12-06',base:{date:'2026-11-20',close:100}};
  assert.deepEqual(C.capsuleOf(j({hypos:[h]}),'2026-11-26'),{k:'sealed',days:10,end:'2026-12-06'});
});
test('no graded hypotheses: no stars', () => {assert.deepEqual(C.starsOf(j(),'2026-11-26'),{hit:0,n:0,stars:0})});
