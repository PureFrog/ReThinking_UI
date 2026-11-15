import test from 'node:test';
import {load} from './load-app.mjs';
import assert from 'node:assert/strict';
const {firstFriend,weighted,newLosses,staleTree,STALE_DAYS,REASON_FRIEND}=await load('core/visit-reason');
const {awayVisit,tracesToday,AWAY}=await load('core/traces');
const {DIALOGUE,awayLine}=await load('content/content');
const tree=(id,rate,name='나무'+id)=>({id,name,kind:0,price:1000,quantity:1,date:'2026-09-01',rate,plot:id,lossDays:0});
const friends=['moa','tori','luon'],day='2026-11-10';
const base={friends,holdings:[tree(1,5),tree(2,3)],lossSeen:[],eventTree:null,journal:[],today:day,closeness:{},roll:0};

// ux-spec 4장 the day's first friend comes for a reason, in this order
test('a tree newly in loss brings moa; one already seen in loss does not',()=>{
 const holdings=[tree(1,5),tree(2,-4)];
 assert.deepEqual(firstFriend({...base,holdings}),{friend:'moa',kind:'loss',holdingId:2});
 assert.equal(firstFriend({...base,holdings,lossSeen:[2]}).kind,'pick');
 assert.equal(newLosses(holdings,null).length,1,'a garden never opened: every loss is new');
});
test('the mock event brings tori, a journal left a while brings luon',()=>{
 assert.deepEqual(firstFriend({...base,eventTree:1}),{friend:'tori',kind:'event',holdingId:1});
 assert.equal(firstFriend({...base,eventTree:9}).kind,'pick','an event on a tree no longer here');
 const old='2026-10-01',journal=[{id:'a',holdingId:2,name:'나무2',day:old,saw:'',think:'x',mood:''}];
 assert.deepEqual(firstFriend({...base,journal}),{friend:'luon',kind:'stale',holdingId:2});
 assert.equal(staleTree(base.holdings,[{...journal[0],day:'2026-11-05'}],day),null,'written lately');
 assert.equal(staleTree(base.holdings,[],day),null,'no journal at all is not a stale one');
 assert.ok(STALE_DAYS>0);
 // order: loss before event before stale
 assert.equal(firstFriend({...base,holdings:[tree(1,5),tree(2,-1)],eventTree:1,journal}).friend,'moa');
 assert.equal(firstFriend({...base,eventTree:1,journal}).friend,'tori');
});
test('no reason: closeness and chance; a reason whose friend is missing is skipped',()=>{
 assert.equal(weighted(friends,{},0),'moa');assert.equal(weighted(friends,{},.99),'luon');
 assert.equal(weighted(friends,{tori:8},.5),'tori','the closest friend is the likeliest');
 const r=firstFriend({...base,friends:['tori','luon'],holdings:[tree(1,-3)]});assert.notEqual(r.kind,'loss');
 assert.deepEqual(Object.values(REASON_FRIEND).sort(),['luon','moa','tori']);
});

// traces of a friend who came while the player was away
test('away long enough: one friend came by, not the one coming now, and watered a tree',()=>{
 const now=Date.parse('2026-11-10T09:00:00'),h=3600000,o={now,day,friends,today:'moa',holdings:base.holdings,rolls:[0,.99]};
 assert.equal(awayVisit({...o,lastSeen:null}),null,'a new garden: nobody came yet');
 assert.equal(awayVisit({...o,lastSeen:now-(AWAY.hours*h-1)}),null,'not away long enough');
 const v=awayVisit({...o,lastSeen:now-AWAY.hours*h});assert.deepEqual(v,{day,friend:'tori',soil:2});
 assert.equal(awayVisit({...o,friends:['moa'],lastSeen:0}).friend,'moa','the only friend can be both');
 assert.equal(awayVisit({...o,holdings:[],lastSeen:0}).soil,null,'no tree to water');
 assert.deepEqual(tracesToday(v,day),{footprints:true,soil:2});
 assert.deepEqual(tracesToday(v,'2026-11-11'),{footprints:false,soil:null},'they last for that day');
});
test('every friend has a note for each case, without advice',()=>{
 const advice=/팔아|사라|사 둬|손절|매도|매수|오를|내릴|떨어질|수익/;
 for(const id of friends){const b=DIALOGUE[id].lines;assert.ok(b.away?.length&&b.awayPlain?.length,id);
  assert.ok(awayLine(id,'카카오').includes('카카오'),id+' names the tree');assert.doesNotMatch(awayLine(id,null),/\{stock\}/);
  for(const l of [...b.away,...b.awayPlain])assert.doesNotMatch(l.text,advice,id)}
});

// ux-spec 4장 the time of day by Seoul time
const {dayPartAt,seoulHour,DAYPARTS,DAYPART_LABEL}=await load('core/daypart');
test('day, evening and night follow the hour; Seoul time whatever the machine says',()=>{
 assert.equal(dayPartAt(DAYPARTS.day),'day');assert.equal(dayPartAt(DAYPARTS.evening-1),'day');
 assert.equal(dayPartAt(DAYPARTS.evening),'evening');assert.equal(dayPartAt(DAYPARTS.night),'night');
 assert.equal(dayPartAt(0),'night');assert.equal(dayPartAt(DAYPARTS.day-1),'night');assert.equal(dayPartAt(24+DAYPARTS.day),'day');
 assert.equal(seoulHour(new Date('2026-11-10T00:30:00Z')),9,'UTC 00:30 is 09:30 in Seoul');
 assert.equal(seoulHour(new Date('2026-11-10T15:10:00Z')),0);
 assert.ok(Object.values(DAYPART_LABEL).every(Boolean));
});
test('every friend says it will come tomorrow, in its own words, without advice',()=>{
 for(const id of friends){const l=DIALOGUE[id].lines.tomorrow;assert.ok(l?.length,id);for(const x of l){assert.match(x.text,/내일/);assert.doesNotMatch(x.text,/팔아|사라|매수|매도|수익/)}}
});
