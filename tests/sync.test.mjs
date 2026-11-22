// Which garden wins on sign-in (app/core/sync.ts): newest wins, an empty garden never overwrites a planted one.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const S=await load('core/sync');
const full={holdings:[{id:1}],judgments:[]},empty={holdings:null,judgments:[]};
const at=(d)=>`2026-11-${d}T10:00:00Z`;

test('newest planted garden wins', () => {
  assert.equal(S.syncPlan({body:full,at:at(10)},{body:full,at:at(12)}),'take-remote');
  assert.equal(S.syncPlan({body:full,at:at(13)},{body:full,at:at(12)}),'keep-local-push');
  assert.equal(S.syncPlan({body:full,at:at(12)},{body:full,at:at(12)}),'nothing');
});
test('an empty garden never overwrites a planted one', () => {
  assert.equal(S.syncPlan({body:empty,at:at(20)},{body:full,at:at(1)}),'take-remote');
  assert.equal(S.syncPlan({body:full,at:at(1)},{body:empty,at:at(20)}),'keep-local-push');
  assert.equal(S.syncPlan({body:full,at:at(1)},null),'keep-local-push');
  assert.equal(S.syncPlan(null,{body:full,at:at(1)}),'take-remote');
  assert.equal(S.syncPlan({body:empty,at:at(1)},null),'nothing');
});
