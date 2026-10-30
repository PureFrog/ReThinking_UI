import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync(new URL('../app/items.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {inventoryEntries,toggleWear,sameSlots,formatDay,ITEMS}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const gift=(id,item,sender=0)=>({id,sender,anonymous:false,item,x:0,y:0});
const empty={hat:null,face:null,neck:null,hand:null};

test('drawer groups the same item into one cell with a count and keeps starter clothes',()=>{
 const gifts=[gift('a','위로 사탕'),gift('b','위로 사탕'),gift('c','여름 선글라스',1),gift('d','작은 별 조명',2)];
 const entries=inventoryEntries(gifts,['a','b','c'],[],[]);
 const candy=entries.find(e=>e.name==='위로 사탕');
 assert.equal(candy.count,2);
 assert.equal(entries.some(e=>e.name==='작은 별 조명'),false,'unclaimed gifts stay in the world');
 assert.ok(entries.some(e=>e.name==='산책 목도리'&&e.def.starter));
});
test('eaten consumables leave the drawer; fresh and placed states are reported',()=>{
 const gifts=[gift('a','위로 사탕'),gift('d','작은 별 조명',2)];
 const entries=inventoryEntries(gifts,['a','d'],['a'],[{id:101,name:'작은 별 조명',color:0,x:1,y:1}],['d']);
 assert.equal(entries.some(e=>e.name==='위로 사탕'),false);
 const lamp=entries.find(e=>e.name==='작은 별 조명');
 assert.equal(lamp.fresh,true);
 assert.equal(lamp.placed,true);
});
test('wearing replaces the item in the same slot, and wearing it again takes it off',()=>{
 const a=toggleWear(empty,'꽃 장식');
 assert.equal(a.hat,'꽃 장식');
 const b=toggleWear(a,'여름 선글라스');
 assert.deepEqual([b.hat,b.face],['꽃 장식','여름 선글라스']);
 assert.equal(toggleWear(b,'꽃 장식').hat,null);
 assert.equal(sameSlots(a,{...empty,hat:'꽃 장식'}),true);
 assert.equal(sameSlots(a,b),false);
 assert.equal(toggleWear(a,'위로 사탕'),a,'non-clothes are ignored');
});
test('dates follow 11.14: year only when it differs',()=>{
 assert.equal(formatDay('2026-10-27','2026-10-30'),'10월 27일');
 assert.equal(formatDay('2025-10-27','2026-10-30'),'2025년 10월 27일');
 assert.equal(formatDay('',"2026-10-30"),'');
});
test('every gift a friend brings exists in the catalog',()=>{
 for(const name of ['위로 사탕','여름 선글라스','작은 별 조명','포근한 담요'])assert.ok(ITEMS[name],name);
});
