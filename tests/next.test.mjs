// The home screen's one next step (app/core/next.ts): grades first, then a signal, the letter, the case, then done.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const N=await load('core/next');
const sig={id:'s1',name:'카카오',analyst:'moa',headline:'저점이 3주째 낮아지는 중'};

test('only the most important thing waiting shows, in a fixed order', () => {
  assert.deepEqual(N.nextStep({due:2,signal:sig,letter:'10월',caseOpen:true}),{kind:'grades',n:2});
  assert.equal(N.nextStep({due:0,signal:sig,letter:'10월',caseOpen:true}).kind,'signal');
  assert.equal(N.nextStep({due:0,signal:sig,letter:null,caseOpen:false}).name,'카카오');
  assert.deepEqual(N.nextStep({due:0,signal:null,letter:'10월',caseOpen:true}),{kind:'letter',month:'10월'});
  assert.deepEqual(N.nextStep({due:0,signal:null,letter:null,caseOpen:true}),{kind:'case'});
  assert.deepEqual(N.nextStep({due:0,signal:null,letter:null,caseOpen:false}),{kind:'done'});
});
