// The master account (core/master.ts, db/migrations/008_master.sql): every wardrobe piece and trust stage open for this
// visit only; coins are topped up to MASTER.coins (the app does it after every spend).
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const Mx=await load('core/master');
const W=await load('core/wardrobe');
const L=await load('core/ledger');

test('master opens every wardrobe piece and colour; off again, the usual rules', () => {
  const ctx={rank:0,stamps:[],trust:{tori:0,moa:0,luon:0},bought:[]};
  const locked=W.WEAR.filter(w=>!W.isOpen(w.unlock,ctx,w.id));
  assert.ok(locked.length>0);
  assert.ok([...W.WEAR,...W.PALETTES].every(w=>W.isOpen(w.unlock,{...ctx,all:true},w.id)));
  const look={coat:locked.find(w=>w.slot==='coat')?.id??'coat_lab',hat:'hat_lamp',bag:null,tool:'tool_loupe',palette:'moss'};
  assert.equal(W.fitLook(look,{...ctx,all:true}).hat,'hat_lamp');
  assert.equal(W.fitLook(look,ctx).hat,null);
});

test('trust stages count as full for master only; coins top up to a fixed amount', () => {
  Mx.setMasterOn(false);assert.equal(Mx.stageFor(1),1);
  Mx.setMasterOn(true);assert.ok(Mx.stageFor(0)>=L.DEEP_AT);assert.equal(Mx.masterOn(),true);
  Mx.setMasterOn(false);
  assert.ok(L.MASTER.coins>=9999);
});
