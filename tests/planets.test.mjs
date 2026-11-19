// 다른 정원들 (app/core/planets.ts): what a planet may carry, by the owner's share setting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const PL=await load('core/planets');
const RULES={oldDays:180,damageDays:60};
const H=[{id:1,name:'SK하이닉스',kind:0,price:52000,quantity:12,date:'2026-08-01',rate:12.4,plot:0,lossDays:0},{id:2,name:'현대차',kind:2,price:24000,quantity:10,date:'2025-12-01',rate:-24,plot:5,lossDays:90}];
const C={name:'나무늘보',rank:'관찰자 3급',habit:'버티는 사람',color:'#4b6638',hit:61,calibration:74,best:40,stamps:6};

test('a planet never carries amounts, quantities, returns or notes; names only when opened; nothing when private', () => {
  assert.equal(PL.myPlanet(H,RULES,'off',C),null);
  const hide=PL.myPlanet(H,RULES,'hide',C),open=PL.myPlanet(H,RULES,'open',C);
  assert.deepEqual(hide.trees.map(t=>t.condition),['bloom','dead']);
  assert.ok(hide.trees.every(t=>!('name' in t)));
  assert.deepEqual(open.trees.map(t=>t.name),['SK하이닉스','현대차']);
  for(const p of [hide,open]){const w=JSON.stringify(PL.wireOf(p));for(const bad of ['price','quantity','rate','52000','12.4','lossDays','date'])assert.ok(!w.includes(bad),bad)}
  assert.ok(!JSON.stringify(PL.wireOf(hide)).includes('새봄'));
});

test('example neighbours are steady for a week, marked as examples, and follow their own share', () => {
  const a=PL.examplePlanets('2026-11-16'),b=PL.examplePlanets('2026-11-16');
  assert.deepEqual(a,b);assert.equal(a.length,7);assert.ok(a.every(p=>p.sample));
  assert.ok(a.filter(p=>p.share==='hide').every(p=>p.trees.every(t=>!t.name)));
  assert.notDeepEqual(PL.examplePlanets('2026-11-23').map(p=>p.hit),a.map(p=>p.hit));
});
