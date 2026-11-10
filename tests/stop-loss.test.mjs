import test from 'node:test';
import {load} from './load-app.mjs';
import assert from 'node:assert/strict';
const {nextSignal,askerFor,reasonEntry}=await load('core/stop-loss');
const {mockSignals}=await load('content/detection');
const {DIALOGUE,askLine,heardLine}=await load('content/content');
const {fill}=await load('core/memory');
const tree=(id,name='꽃빛뷰티')=>({id,name,kind:1,price:28000,quantity:20,date:'2026-09-01',rate:-13,plot:3,lossDays:25});

// 13.7-10 the mock detection flags the holdings named in ?detect=, once per holding per day
test('mock detection flags only holdings in the garden, one signal a day',()=>{
 const s=mockSignals([3,9],[tree(3),tree(4,'달빛스튜디오')],'2026-11-10');
 assert.deepEqual(s,[{id:'3:2026-11-10',holdingId:3,day:'2026-11-10'}]);
 assert.notEqual(mockSignals([3],[tree(3)],'2026-11-11')[0].id,s[0].id,'the next day is a new signal');
});

test('each signal is asked once, and only while its tree is still there',()=>{
 const s=mockSignals([3,4],[tree(3),tree(4)],'2026-11-10');
 assert.equal(nextSignal(s,[],[tree(3),tree(4)]).holdingId,3);
 assert.equal(nextSignal(s,['3:2026-11-10'],[tree(3),tree(4)]).holdingId,4);
 assert.equal(nextSignal(s,['3:2026-11-10'],[tree(3)]),null,'tree 4 was uprooted');
});

test('a friend already here asks; otherwise the closest friend comes',()=>{
 assert.equal(askerFor(['tori'],['moa','tori','luon'],{luon:90}),'tori');
 assert.equal(askerFor([],['moa','tori','luon'],{luon:90,moa:10}),'luon');
 assert.equal(askerFor([],['moa','tori','luon'],{}),'moa','ties keep roster order');
});

test('the reason is kept as a journal page of that tree',()=>{
 const e=reasonEntry(tree(3),'  피부 관리 시장이 커질 것 같아서  ','moa','2026-11-10',1);
 assert.deepEqual(e,{id:'reason-3-1',holdingId:3,name:'꽃빛뷰티',day:'2026-11-10',saw:'',think:'피부 관리 시장이 커질 것 같아서',mood:'',asked:'moa'});
});

// every friend asks in its own words, names the stock, and never advises (ux-spec 3장)
test('ask and heard lines exist for every friend, fill in, and carry no advice',()=>{
 const advice=/팔아|사라|사 둬|손절|매도|매수|오를|내릴|떨어질|버텨|정리해/;
 const asks=new Set();
 for(const [id,book] of Object.entries(DIALOGUE)){
  assert.ok(book.lines.ask?.length&&book.lines.heard?.length,id+' has ask and heard lines');
  for(const l of book.lines.ask){assert.ok(fill(l.text,{stock:'꽃빛뷰티'}).includes('꽃빛뷰티'),id+' names the stock');assert.doesNotMatch(l.text,advice,id);asks.add(l.text)}
  for(const l of book.lines.heard){assert.ok(fill(l.text,{reason:'이유'}).includes('이유'),id+' reads the reason back');assert.doesNotMatch(l.text,advice,id)}
  assert.ok(askLine(id,'꽃빛뷰티').includes('꽃빛뷰티'));
 }
 assert.equal(asks.size,Object.values(DIALOGUE).reduce((n,b)=>n+b.lines.ask.length,0),'no two friends share an ask line');
 assert.ok(heardLine('moa','가'.repeat(40)).includes('…'),'a long reason is cut short');
});
