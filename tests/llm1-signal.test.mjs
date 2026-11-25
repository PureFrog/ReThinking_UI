// /signal 종목명 and 루온's stock pick (2026-11-24; app/core/llm1/signal.ts, engine.ts signalStock): a stock name typed or
// picked resolves to the garden's own code, then the talk turns to detection mode on that stock.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load} from './load-app.mjs';
const S=await load('core/llm1/signal'),E=await load('core/llm1/engine'),K=await load('core/jigi/stocks');
const json=n=>JSON.parse(fs.readFileSync(new URL(`../app/content/llm1/${n}`,import.meta.url),'utf8'));
const bori=json('persona_bori.json'),luon=json('persona_luon.json'),registry=json('field_registry.json'),userTemplate=json('user_profile_template.json'),strategyTemplate=json('strategy_template.json'),examples=json('philosophy_examples.json').examples;
const listed=[...K.STOCKS,...K.KOSDAQ_STOCKS];
const garden=[{company_id:'005930',name:'삼성전자'},{company_id:'086520',name:'에코프로'},{company_id:'247540',name:'에코프로비엠'},{company_id:'M123456',name:'한빛전자'}];

test('/signal is parsed off a message; other text is not a command', () => {
  assert.equal(S.parseSignal('/signal 삼성전자'),'삼성전자');
  assert.equal(S.parseSignal('  /SIGNAL   에코프로 비엠 '),'에코프로 비엠');
  assert.equal(S.parseSignal('/signal'),'');
  assert.equal(S.parseSignal('/signals 삼성전자'),null);
  assert.equal(S.parseSignal('삼성전자 /signal'),null);
});

test('a name resolves to the garden code first, then the listed stocks; mock-coded trees by their name', () => {
  assert.deepEqual(S.resolveStock('삼성 전자',garden,listed),{status:'held',company_id:'005930',name:'삼성전자'});
  assert.deepEqual(S.resolveStock('005930',garden,listed),{status:'held',company_id:'005930',name:'삼성전자'});
  // a typed-in tree (mock code) is found by its name, not left out
  assert.equal(S.resolveStock('한빛전자',garden,listed).company_id,'M123456');
  // exact beats prefix: 에코프로 is 에코프로, not 에코프로비엠
  assert.equal(S.resolveStock('에코프로',garden,listed).company_id,'086520');
  assert.equal(S.resolveStock('에코프로BM',garden,listed).status,'unknown');
  // a unique prefix in the garden is enough; two trees sharing it are not guessed
  assert.equal(S.resolveStock('삼성',garden,listed).company_id,'005930');
  assert.equal(S.resolveStock('에코',garden,listed).status,'unknown');
  // a real stock that is not in the garden; a name that is not a stock
  assert.deepEqual(S.resolveStock('카카오',garden,listed),{status:'not-held',company_id:'035720',name:'카카오'});
  assert.equal(S.resolveStock('없는회사',garden,listed).status,'unknown');
  // the fixed lines never advise
  for(const L of Object.values(S.SIGNAL_LINES))for(const t of [L.empty,L.notHeld('카카오'),L.unknown('x')])assert.doesNotMatch(t,/팔아|사세요|오를 거|떨어질 거/);
});

function harness(persona=bori,o){
  let now=Date.parse('2026-11-24T01:00:00Z');const calls=[];
  const world={persona,registry,strategyTemplate,userTemplate,examples,news:[],now:()=>now,holdings:garden.map(h=>({...h,status:'holding'}))};
  const reply=t=>JSON.stringify({reply:{text:t,emotion:'curious',mentioned_news_ids:[]},conversation_state_update:null,profile_update:{base_revision:null,changes:[],strategy_proposals:[]},
    elicitation:{base_revision:0,decision:'continue',finish_reason:null,decision_note:'듣는 중',evidence_changes:[],unresolved_points:[],next_question_goal:'보유 이유 듣기'}});
  const model=async(msgs,mode)=>{calls.push(mode);return reply('…왜 갖고 있어?')};
  const store=E.newStore('u1',persona,userTemplate,now);if(o)store.conv=E.openSession('u1',persona,now,o);
  return {store,world,model,calls};
}

test('a picked stock opens detection mode on it, with the time; picking another pauses the first', async () => {
  const h=harness();
  const a=await E.signalStock(h.store,h.world,h.model,'005930',{sourceModel:'user_signal_command'});
  assert.equal(a.result.mode,'elicitation');
  assert.match(a.result.at,/^2026-11-24T10:00:00\+09:00$/);
  const es=a.store.sessions.find(s=>s.elicitation_id===a.store.conv.active_elicitation_id);
  assert.equal(es.company_id,'005930');
  assert.equal(a.store.events[0].source_model,'user_signal_command');
  // another stock: the first talk waits (paused), the new one opens
  const b=await E.signalStock(a.store,h.world,h.model,'086520');
  const now=b.store.sessions.find(s=>s.elicitation_id===b.store.conv.active_elicitation_id);
  assert.equal(now.company_id,'086520');
  assert.equal(b.store.sessions.find(s=>s.company_id==='005930').status,'paused');
  // back to the first: the paused talk is picked up, not a second one
  const c=await E.signalStock(b.store,h.world,h.model,'005930');
  assert.equal(c.store.sessions.filter(s=>s.company_id==='005930').length,1);
  assert.equal(c.store.sessions.find(s=>s.elicitation_id===c.store.conv.active_elicitation_id).company_id,'005930');
  assert.equal(c.store.sessions.find(s=>s.company_id==='005930').status,'collecting');
  // not in the garden: nothing opens, no model call
  const n=h.calls.length;
  assert.equal(await E.signalStock(c.store,h.world,h.model,'035720'),null);
  assert.equal(h.calls.length,n);
});

test('루온: its own persona and ids, apart from 보리', async () => {
  assert.equal(luon.character_id,'luon');
  assert.deepEqual(luon.json.system_state.allowed_emotions,bori.json.system_state.allowed_emotions);
  assert.ok(luon.json.speech_and_voice.strictly_avoid.some(x=>/매수·매도 권유/.test(x)));
  const h=harness(luon,{sessionId:'s2',idPrefix:'lu-'});
  const a=await E.signalStock(h.store,h.world,h.model,'247540');
  assert.equal(a.store.conv.session_id,'s2');
  assert.match(a.store.events[0].event_id,/^lu-sl/);
  assert.match(a.store.conv.active_elicitation_id,/^lu-es/);
  // 보리's ids keep their old shape
  const b=await E.signalStock(harness().store,h.world,h.model,'247540');
  assert.match(b.store.events[0].event_id,/^sl\d/);
});
