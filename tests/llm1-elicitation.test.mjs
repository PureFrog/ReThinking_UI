// 1번 LLM detection talk (app/core/llm1, port of 정균 LLM_N1 tests/test_elicitation.py + test_delivery.py) with a
// scripted model: a stop-loss signal on a holding → 보리 opens the talk → the player's own words become evidence →
// finish is checked by rules → a delivery job → the analysis receiver's persisted receipt lets the quotes go.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load} from './load-app.mjs';
const E=await load('core/llm1/engine');
const EL=await load('core/llm1/elicitation');
const P=await load('core/llm1/prompt');
const json=n=>JSON.parse(fs.readFileSync(new URL(`../app/content/llm1/${n}`,import.meta.url),'utf8'));
const persona=json('persona_bori.json'),registry=json('field_registry.json'),userTemplate=json('user_profile_template.json'),strategyTemplate=json('strategy_template.json'),examples=json('philosophy_examples.json').examples;

function harness(){
  let now=Date.parse('2026-11-16T01:00:00Z');const queue=[],calls=[];
  const world={persona,registry,strategyTemplate,userTemplate,examples,news:[],now:()=>now,
    holdings:[{company_id:'005930',name:'삼성전자',status:'holding'},{company_id:'000660',name:'SK하이닉스',status:'holding'},{company_id:'035420',name:'NAVER',status:'sold'}]};
  const model=async(msgs,mode)=>{calls.push({msgs,mode});const next=queue.shift();if(next instanceof Error)throw next;return typeof next==='function'?next(msgs):next};
  const h={store:E.newStore('u1',persona,userTemplate,now),calls,world,advance:s=>{now+=s*1e3},now:()=>now,
    signal(stocks){const r=E.receiveStopLossSignal(h.store,world,stocks);h.store=r.store;return r},
    async open(...outs){queue.push(...outs);const r=await E.startNextPendingDetection(h.store,world,model);if(r)h.store=r.store;return r?.result??null},
    async say(text,...outs){queue.push(...outs);const r=await E.runTurn(h.store,world,model,{text});h.store=r.store;return r.result},
    get es(){return h.store.sessions.find(s=>s.elicitation_id===h.store.conv.active_elicitation_id)??h.store.sessions.at(-1)}};
  return h;
}
// scripted elicitation outputs; the model reads this turn's message id and the collection revision from its input
const read=msgs=>{const c=msgs[1].content;
  const st=JSON.parse(c.split('ELICITATION_STATE:\n')[1].split('\n\n[이 사용자의')[0]);
  const u=JSON.parse(c.split('[최근 대화와 현재 사용자 발언 — 참고 데이터]\n')[1].split('\n\n위 데이터')[0]);return {cur:u.CURRENT_MESSAGE,rev:st?.base_revision??0,st}};
const elic=(text,o={})=>msgs=>{const {cur,rev,st}=read(msgs);const x=typeof o==='function'?o(cur,st):o;
  return JSON.stringify({reply:{text,emotion:'curious',mentioned_news_ids:[]},conversation_state_update:null,profile_update:{base_revision:null,changes:[],strategy_proposals:[]},
    elicitation:{base_revision:x.rev??rev,decision:x.decision??'continue',finish_reason:x.finish_reason??null,decision_note:x.note??'이유를 듣는 중',evidence_changes:x.changes??[],
      unresolved_points:x.unresolved??[],next_question_goal:x.decision&&x.decision!=='continue'?null:('goal' in x?x.goal:'보유 이유 듣기')}})};
const add=(mid,quote,o={})=>({op:'add',target_id:null,kind:o.kind??'reason',origin:o.origin??'user_initiated',source_refs:[{message_id:mid,quote}],context_message_ids:o.ctx??[],summary:o.summary??'요약',is_prior_reason:o.prior??true});
const finish=(why='sufficient',o={})=>({decision:'finish',finish_reason:why,note:'이유가 충분히 나옴',...o});

test('signals: held stocks only, one open signal per stock, queued in order', () => {
  const h=harness();
  const r=h.signal(['005930','035420','999999','005930']);
  assert.equal(r.accepted.length,1);
  assert.deepEqual(r.rejected.map(x=>x.reason.split(' ')[0]),['사용자','기업','같은']);
  h.signal([{company_id:'000660',detail:{drop:-0.12}}]);
  assert.deepEqual(h.store.conv.pending_detection_events,['sl001','sl002']);
});

test('보리 opens the talk in elicitation mode; the strict schema needs the elicitation block', async () => {
  const h=harness();h.signal(['005930']);
  const r=await h.open(elic('삼성전자 손절 신호가 떴더라. 처음에 왜 샀는지 얘기해줄래?'));
  assert.equal(r.mode,'elicitation');assert.match(r.reply.text,/손절 신호/);assert.equal(h.calls[0].mode,'elicitation');
  assert.match(h.calls[0].msgs[0].content,/MODE = elicitation|elicitation/);assert.match(h.calls[0].msgs[1].content,/"reason_code": "stop_loss_signal"/);
  assert.equal(h.es.status,'collecting');assert.equal(h.store.events[0].status,'in_progress');
  assert.equal(P.ELICITATION_SCHEMA.strict,true);assert.ok(P.ELICITATION_SCHEMA.schema.properties.elicitation.required.includes('decision'));
  // one talk at a time: the second signal waits
  h.signal(['000660']);assert.equal(await h.open(),null);
});

test("evidence is the player's quotes; 보리's lines and plain backchannels cannot be reasons", async () => {
  const h=harness();h.signal(['005930']);await h.open(elic('왜 샀었어?'));
  const charId=h.store.conv.recent_messages.at(-1).message_id;
  const r=await h.say('응',elic('그렇구나. 어떤 점이 좋았어?',cur=>({changes:[add(cur.message_id,'응'),add(charId,'왜 샀었어')]})));
  assert.equal(r.evidence_applied.length,0);
  assert.match(r.evidence_rejected.map(x=>x.reason).join('|'),/단순 호응/);assert.match(r.evidence_rejected.map(x=>x.reason).join('|'),/사용자 메시지가 아님/);
  const x=await h.say('지금 생각해보니 배당도 좋더라',elic('오.',cur=>({changes:[add(cur.message_id,'배당도 좋더라',{origin:'new_reflection',prior:true})]})));
  assert.match(x.evidence_rejected[0].reason,/new_reflection/);
});

test('finish is checked: not while the player is still talking; sufficient builds a delivery job with quotes only', async () => {
  const h=harness();h.signal(['005930']);await h.open(elic('왜 샀었어?'));
  await h.say('메모리 업황이 바닥이라고 봤어',elic('그렇구나. 언제까지 볼 생각이었어?',cur=>({changes:[add(cur.message_id,'메모리 업황이 바닥이라고 봤어')]})));
  assert.equal(h.es.revision,1);
  const no=await h.say('1년 정도. 그리고 하나 더',elic('응, 말해줘.',cur=>({...finish(),changes:[add(cur.message_id,'1년 정도',{kind:'horizon'})]})));
  assert.equal(no.elicitation_status,'collecting');assert.match(no.finish_check,/추가 설명/);
  const ok=await h.say('HBM 수주도 기대했어',elic('알겠어, 잘 들었어. 정리해서 넘길게.',cur=>({...finish(),changes:[add(cur.message_id,'HBM 수주도 기대했어')]})));
  assert.equal(ok.elicitation_status,'ready');assert.equal(ok.delivery_request_id,'ar001');
  const job=h.store.jobs[0],p=job.payload;
  assert.equal(job.route,'argument_analysis');assert.equal(p.company_id,'005930');
  // v2.0: the body is the talk as question/answer pairs, the player's words as said (no quotes cut out, no S4 adapter)
  assert.equal(p.schema_version,'2.0');assert.ok(!('segments' in p)&&!('investor_natural_language' in p));
  assert.deepEqual(p.conversation.map(c=>c.answer),['메모리 업황이 바닥이라고 봤어','1년 정도. 그리고 하나 더','HBM 수주도 기대했어']);
  assert.equal(p.conversation[0].question,'왜 샀었어?');assert.equal(p.conversation[1].question,'그렇구나. 언제까지 볼 생각이었어?');
});

test('a line that only reacts pairs the next answer with null; corrections stay in the order they were said', async () => {
  const h=harness();h.signal(['005930']);await h.open(elic('삼성전자 요즘 어떻게 보고 있어?'));
  await h.say('신제품 때문에 들고 있어',elic('오, 신제품 기대되긴 하더라.',cur=>({goal:null,changes:[add(cur.message_id,'신제품 때문에 들고 있어')]})));
  await h.say('배당도 좋고',elic('그렇구나.',cur=>({goal:null,changes:[add(cur.message_id,'배당도 좋고')]})));
  await h.say('아 배당은 아니다. 취소',elic('알겠어, 배당은 빼고. 또 있어?'));
  const r=await h.say('더는 없어',elic('알겠어, 잘 들었어.',finish('limited_more')));
  const conv=h.store.jobs.find(j=>j.request_id===r.delivery_request_id).payload.conversation;
  assert.deepEqual(conv,[{question:'삼성전자 요즘 어떻게 보고 있어?',answer:'신제품 때문에 들고 있어'},{question:null,answer:'배당도 좋고'},
    {question:null,answer:'아 배당은 아니다. 취소'},{question:'알겠어, 배당은 빼고. 또 있어?',answer:'더는 없어'}]);
});

test('finish with a question in the line gets a repair; no evidence means no finish', async () => {
  const h=harness();h.signal(['005930']);await h.open(elic('왜 샀었어?'));
  const r=await h.say('그냥',elic('알겠어. 더 있어?',finish()),elic('알겠어.',finish()));
  assert.equal(h.calls.length,3);assert.match(h.calls[2].msgs.at(-1).content,/새 질문/);
  assert.equal(r.elicitation_status,'collecting');assert.match(r.finish_check,/활성 근거/);
});

test('"그만하자" pauses (nothing is sent quietly); resume picks it up again', async () => {
  const h=harness();h.signal(['005930']);await h.open(elic('왜 샀었어?'));
  const r=await h.say('이 얘기 그만하자',elic('응, 알았어. 나중에 해도 돼.'));
  assert.equal(r.elicitation_status,'paused');assert.equal(h.store.jobs.length,0);assert.match(r.notes.join(' '),/중단·보류 요청/);
  const d=await h.say('오늘 날씨 좋다',JSON.stringify({reply:{text:'그러게.',emotion:'happy',mentioned_news_ids:[]},conversation_state_update:null,profile_update:{base_revision:null,changes:[],strategy_proposals:[]},elicitation:null}));
  assert.equal(d.mode,'daily');
  const res=await E.resumeElicitation(h.store,h.world,async msgs=>elic('그때 얘기 이어서 해볼까? 왜 샀었어?')(msgs));
  assert.equal(res.result.mode,'elicitation');assert.equal(res.result.elicitation_status,'collecting');assert.match(res.result.reply.text,/이어서/);
});

test('a stale revision changes nothing', async () => {
  const h=harness();h.signal(['005930']);await h.open(elic('왜 샀었어?'));
  const r=await h.say('업황이 바닥이었어',elic('응.',cur=>({rev:7,changes:[add(cur.message_id,'업황이 바닥이었어')]})));
  assert.match(r.notes.join(' '),/revision 충돌/);assert.equal(h.es.evidence.length,0);
});

test('delivery: retry with backoff, then a persisted receipt drops the quotes and frees 보리 for the next signal', async () => {
  const h=harness();h.signal(['005930','000660']);await h.open(elic('왜 샀었어?'));
  await h.say('메모리 업황이 바닥이라고 봤어',elic('알겠어, 잘 들었어.',cur=>({...finish(),changes:[add(cur.message_id,'메모리 업황이 바닥이라고 봤어')]})));
  let fail=await E.runDeliveryWorker(h.store,async()=>{throw new Error('down')},h.now());
  assert.equal(fail.results[0].status,'retry_scheduled');h.store=fail.store;
  const again=await E.runDeliveryWorker(h.store,async()=>{throw new Error('x')},h.now());assert.equal(again.results.length,0);// waits 5s
  h.advance(6);const inbox=[];
  const ok=await E.runDeliveryWorker(h.store,async job=>{inbox.push(job);return {request_id:job.request_id,payload_hash:job.payload_hash,status:'persisted'}},h.now());
  h.store=ok.store;assert.equal(ok.results[0].status,'delivered');assert.equal(inbox[0].payload_hash.length,64);
  assert.equal(h.store.jobs[0].payload,null);assert.equal(h.store.sessions[0].messages.length,0);assert.equal(h.store.sessions[0].status,'delivered');
  assert.equal(h.store.events[0].status,'done');assert.equal(h.store.conv.active_elicitation_id,null);
  const next=await h.open(elic('SK하이닉스도 손절 신호가 떴어. 이건 왜 샀었어?'));assert.match(next.reply.text,/SK하이닉스/);
});

test('delivery: a mismatched receipt retries; a conflict stops', async () => {
  const h=harness();h.signal(['005930']);await h.open(elic('왜 샀었어?'));
  await h.say('업황이 바닥이었어',elic('알겠어.',cur=>({...finish(),changes:[add(cur.message_id,'업황이 바닥이었어')]})));
  const bad=await E.runDeliveryWorker(h.store,async j=>({request_id:j.request_id,payload_hash:'nope',status:'persisted'}),h.now());
  assert.equal(bad.results[0].status,'retry_scheduled');assert.notEqual(bad.store.jobs[0].payload,null);
  h.advance(6);const c=await E.runDeliveryWorker(bad.store,async j=>({request_id:j.request_id,payload_hash:'other',status:'conflict'}),h.now());
  assert.equal(c.store.jobs[0].status,'failed_conflict');
});

test('two question turns in a row: the third asks for a line without a question', async () => {
  const h=harness();h.signal(['005930']);await h.open(elic('왜 샀었어?'));
  await h.say('글쎄',elic('어떤 점이 좋았어?'));
  await h.say('음',elic('언제 샀어?',{}),elic('언제 샀어?'));
  assert.match(h.calls.at(-1).msgs.at(-1).content,/연속 질문/);
});

// the remaining pieces of 정균's engine (2026-11-16): expire_stale, reopen_for_correction, the ops log, company files
const deliver=async h=>{const ok=await E.runDeliveryWorker(h.store,async j=>({request_id:j.request_id,payload_hash:j.payload_hash,status:'persisted'}),h.now());h.store=ok.store};

test('a talk left unanswered for 7 days expires: quotes gone, signal expired, 보리 back to daily; old job records go after 30 days', async () => {
  const h=harness();h.signal(['005930','000660']);await h.open(elic('왜 샀었어?'));
  await h.say('메모리 업황이 바닥이라고 봤어',elic('그렇구나.',cur=>({changes:[add(cur.message_id,'메모리 업황이 바닥이라고 봤어')]})));
  assert.deepEqual(E.expireStale(h.store,h.now()+6*864e5).expired,[]);
  const r=E.expireStale(h.store,h.now()+8*864e5);h.store=r.store;
  assert.deepEqual(r.expired,['es001']);
  const es=h.store.sessions[0];assert.equal(es.status,'expired');assert.equal(es.messages.length,0);assert.ok(es.evidence.every(e=>!('source_refs' in e)));
  assert.equal(h.store.events[0].status,'expired');assert.equal(h.store.conv.active_elicitation_id,null);
  // the next signal can open now
  h.advance(8*86400);const next=await h.open(elic('SK하이닉스는 어떻게 보고 있어?'));assert.match(next.reply.text,/SK하이닉스/);
  // a ready (not delivered) job expires with its session; delivered job records are dropped after their retention
  const h2=harness();h2.signal(['005930']);await h2.open(elic('왜 샀었어?'));
  await h2.say('메모리 업황이 바닥이라고 봤어',elic('알겠어, 잘 들었어.',cur=>({...finish(),changes:[add(cur.message_id,'메모리 업황이 바닥이라고 봤어')]})));
  const x=E.expireStale(h2.store,h2.now()+8*864e5).store;assert.equal(x.jobs[0].status,'expired');assert.equal(x.jobs[0].payload,null);
  await deliver(h2);assert.equal(h2.store.jobs[0].status,'delivered');
  assert.equal(E.expireStale(h2.store,h2.now()+29*864e5).store.jobs.length,1);
  assert.equal(E.expireStale(h2.store,h2.now()+31*864e5).store.jobs.length,0);
});

test('a correction after delivery opens a new talk that names the request it replaces', async () => {
  const h=harness();h.signal(['005930']);await h.open(elic('왜 샀었어?'));
  await h.say('메모리 업황이 바닥이라고 봤어',elic('알겠어, 잘 들었어.',cur=>({...finish(),changes:[add(cur.message_id,'메모리 업황이 바닥이라고 봤어')]})));
  await assert.rejects(()=>E.reopenForCorrection(h.store,h.world,async()=>'{}','ar001'),/delivered/);
  await deliver(h);
  h.store=(await E.reopenForCorrection(h.store,h.world,async msgs=>elic('아까 얘기 중에 고칠 게 있었어?')(msgs),'ar001')).store;
  const es=h.store.sessions.at(-1);assert.equal(es.elicitation_id,'es002');assert.equal(es.supersedes_request_id,'ar001');assert.equal(es.status,'collecting');
  assert.equal(h.store.conv.active_elicitation_id,'es002');
  await h.say('HBM도 기대했었어',elic('알겠어, 고마워.',cur=>({...finish(),changes:[add(cur.message_id,'HBM도 기대했었어')]})));
  assert.equal(h.store.jobs.at(-1).payload.supersedes_request_id,'ar001');
});

test('each turn gives an ops line without any message text; the company file goes into COMPANY_CONTEXT', async () => {
  const h=harness();h.world.companies=json('companies.json');h.world.modelName='scripted';
  assert.equal(Object.keys(h.world.companies).length,12);
  for(const c of Object.values(h.world.companies)){assert.ok(c.industry&&c.business_summary&&c.value_chain.position);assert.equal(c.fictional,false);
    assert.doesNotMatch(JSON.stringify(c),/팔아|사라|매수|매도|오를|떨어질/)}
  h.signal(['005930']);const r=await h.open(elic('요즘 삼성전자 어떻게 보고 있어?'));
  const input=h.calls[0].msgs[1].content;assert.match(input,/"business_summary": "메모리 반도체와 파운드리/);assert.match(input,/"context_version": "rt-v1"/);
  const line=E.opsEntry(r,h.world);
  assert.equal(line.mode,'elicitation');assert.equal(line.llm,'scripted');assert.equal(typeof line.llm_ms,'number');assert.equal(line.format_or_network_errors,0);
  assert.equal(line.elicitation_status,'collecting');assert.doesNotMatch(JSON.stringify(line),/삼성전자 어떻게/);
});
