// 건물 상인 → 마을에 자리 골라 놓기 (core/land.ts spend with a spot, buildingAt)
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const L=await load('core/land');

test('a building bought with a spot stands there; one without stands on its lot', () => {
  const b=L.BUILDINGS[0],r=L.spend(L.BUILT0,10_000_000,{kind:'building',id:b.id},[3,4]);
  assert.ok(r.ok);assert.deepEqual(L.buildingAt(b,r.built),[3,4]);assert.deepEqual(r.built.buildings,[b.id]);
  const r2=L.spend(L.BUILT0,10_000_000,{kind:'building',id:b.id});assert.ok(r2.ok);assert.deepEqual(L.buildingAt(b,r2.built),b.at);
  assert.equal(L.spend(r.built,10_000_000,{kind:'building',id:b.id},[1,1]).ok,false);
});
