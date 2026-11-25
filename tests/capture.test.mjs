// Reading a brokerage screenshot (app/core/capture.ts): every stock row kept in order, numbers cleaned, no account
// numbers or totals, duplicates and junk dropped.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const C=await load('core/capture');

test('several stocks in one picture: all kept, in order, with their numbers cleaned', () => {
  const raw='```json\n'+JSON.stringify([{name:'삼성전자',rate:'-4.21%',quantity:'12주',price:'74,300원'},{name:'SK하이닉스',rate:12.4,quantity:3,price:null},
    {name:'카카오',rate:null,quantity:null,price:null},{name:' NAVER ',rate:'+7.2',quantity:8,price:185100}])+'\n```';
  const r=C.parseCapture(raw);
  assert.deepEqual(r.map(x=>x.name),['삼성전자','SK하이닉스','카카오','NAVER']);
  assert.deepEqual(r[0],{name:'삼성전자',rate:-4.21,quantity:12,price:74300});
  assert.equal(r[2].rate,0);assert.equal(r[1].price,undefined);
});

test('account numbers, totals, duplicates and junk are dropped; bad JSON is null', () => {
  const r=C.parseCapture(JSON.stringify([{name:'123-45-678901',rate:1},{name:'총 평가금액',rate:3},{name:'삼성전자',rate:1},{name:'삼성전자',rate:2},{name:5},null]));
  assert.deepEqual(r.map(x=>x.name),['삼성전자']);
  assert.equal(C.parseCapture('읽을 수 없어요'),null);
  assert.match(C.capturePrompt(),/계좌번호/);assert.match(C.capturePrompt(),/여러 종목/);
});

test('the return comes from the average and the current price, not the day\'s move beside the price', () => {
  // the 토스 현재가 view (2026-11-24): 에코프로 avg 184,700, now 69,300, +9.6% today
  const r=C.parseCapture(JSON.stringify([{name:'에코프로',rate:9.6,price:184700,current:69300},{name:'아이렌',rate:null,price:59672,current:19566},{name:'HLB',rate:-12}]));
  assert.equal(r[0].rate,-62.48);
  assert.equal(r[1].rate,-67.21);
  assert.equal(r[2].rate,-12);
  assert.match(C.capturePrompt(),/등락률/);
});
