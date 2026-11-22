// 1번 LLM everyday turn (app/core/llm1, port of 정균 LLM_N1 tests/test_daily.py + test_contracts.py) with a scripted
// model: only the player's own words update the profile, repairs, fallback, emotions, delete/block/unblock, no
// upgrade without new evidence, strategies, revision conflicts, duplicate ids, the visit limit, buffer expiry.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load} from './load-app.mjs';
const E=await load('core/llm1/engine');
const P=await load('core/llm1/prompt');
const PR=await load('core/llm1/profile');
const R=await load('core/llm1/registry');
const json=n=>JSON.parse(fs.readFileSync(new URL(`../app/content/llm1/${n}`,import.meta.url),'utf8'));
const persona=json('persona_bori.json'),registry=json('field_registry.json'),userTemplate=json('user_profile_template.json'),strategyTemplate=json('strategy_template.json'),examples=json('philosophy_examples.json').examples;

function harness(){
  let now=Date.parse('2026-11-16T01:00:00Z');const queue=[],calls=[];
  const world={persona,registry,strategyTemplate,userTemplate,examples,holdings:[{company_id:'005930',name:'삼성전자',industry:'반도체'}],news:[],now:()=>now};
  const model=async msgs=>{calls.push(msgs);const next=queue.shift();if(next instanceof Error)throw next;return typeof next==='function'?next(msgs):next};
  const h={store:E.newStore('u1',persona,userTemplate,now),get conv(){return h.store.conv},set conv(v){h.store.conv=v},get profile(){return h.store.profile},calls,
    advance:hrs=>{now+=hrs*3600e3},
    async say(text,...outs){queue.push(...outs);const r=await E.runTurn(h.store,world,model,{text});h.store=r.store;return r.result},
    async visit(...outs){queue.push(...outs);const r=await E.runTurn(h.store,world,model,{text:null,spontaneous:true});h.store=r.store;return r.result},
    lastUser:()=>[...h.conv.recent_messages].reverse().find(m=>m.role==='user'),lastChar:()=>[...h.conv.recent_messages].reverse().find(m=>m.role==='character')};
  return h;
}
// scripted outputs (like 정균 scripted.py daily/pset/premove)
const daily=(text,emotion='neutral',o={})=>JSON.stringify({reply:text==null?null:{text,emotion,mentioned_news_ids:[]},conversation_state_update:o.state??null,
  profile_update:{base_revision:null,changes:o.changes??[],strategy_proposals:o.strategies??[]},elicitation:null});
const pset=(path,value,quote,o={})=>({op:'set',path,value,basis:o.basis??'explicit',confidence:o.confidence??'medium',scope:'일반',evidence_summary:'요약',source_refs:[{message_id:o.mid,quote}]});
const premove=(path,quote,o={})=>({op:o.op??'remove',path,value:null,basis:null,confidence:null,scope:null,evidence_summary:null,source_refs:[{message_id:o.mid,quote}]});
// the model sees this turn's message ids in its input; the scripts fill them in late
const late=f=>msgs=>{const u=JSON.parse(msgs[1].content.split('[최근 대화와 현재 사용자 발언 — 참고 데이터]\n')[1].split('\n\n위 데이터')[0]);return f(u.CURRENT_MESSAGE,u.RECENT_MESSAGES)};

test('a first chat: no profile change, a passing mood that expires', async () => {
  const h=harness();
  const r=await h.say('오늘 좀 피곤하다',daily('이리 와서 앉아.','concerned',{state:{last_topic:null,open_question:null,mood:'피곤함',paused_topics:null}}));
  assert.equal(r.reply.text,'이리 와서 앉아.');assert.equal(h.profile.revision,0);assert.equal(h.conv.state.mood,'피곤함');
  h.advance(7);await h.say('이제 괜찮아',daily('다행이다.','happy'));assert.equal(h.conv.state.mood,null);
});

test('the prompt carries the persona (보리), the rules and the data; strict schema for the reply', async () => {
  const h=harness();await h.say('안녕',daily('어, 왔어?'));
  const [sys,user]=h.calls[0];assert.match(sys.content,/보리 \(Bori\)/);assert.match(sys.content,/MODE = daily/);assert.match(sys.content,/PATH_REGISTRY/);
  assert.match(user.content,/"CURRENT_MESSAGE"/);assert.match(user.content,/삼성전자/);
  assert.equal(P.DAILY_SCHEMA.strict,true);assert.deepEqual(P.DAILY_SCHEMA.schema.required,['reply','conversation_state_update','profile_update','elicitation']);
});

test('a broken output gets one repair; two broken outputs give the fallback line and no change', async () => {
  const h=harness();
  const r=await h.say('그냥 그래',JSON.stringify({reply:{text:'오 그래?',emotion:'curious',mentioned_news_ids:[]},conversation_state_update:null,profile_update:{base_revision:null,changes:[],strategy_proposals:[]},elicitation:{decision:'continue'}}),daily('그렇구나.'));
  assert.equal(r.reply.text,'그렇구나.');assert.equal(h.calls.length,2);assert.match(h.calls[1].at(-1).content,/^직전 출력이 계약을 위반/);
  const h2=harness();const f=await h2.say('안녕','not json','still not json');assert.match(f.reply.text,/다시/);assert.equal(h2.profile.revision,0);
});

test('an emotion 보리 does not have becomes neutral; a model error gives the fallback', async () => {
  const h=harness();assert.equal((await h.say('안녕',daily('어, 왔어?','angry'))).reply.emotion,'neutral');
  assert.match((await h.say('안녕',new Error('timeout'))).reply.text,/다시/);
});

test("only the player's own words update the profile, never 보리's", async () => {
  const h=harness();
  await h.say('남들은 다 빨리 버는 것 같아.',daily('천천히 가도 안정적인 게 더 좋아?','thinking'));
  const charId=h.lastChar().message_id;
  const r=await h.say('응. 하루에 막 출렁이면 신경 쓰여.',late(cur=>daily('그렇구나.','neutral',{changes:[
    pset('preferences.volatility','일중 변동 큰 종목 부담','하루에 막 출렁이면 신경 쓰여',{mid:cur.message_id}),
    pset('preferences.monitoring','안정 선호','천천히 가도 안정적인 게 더 좋아',{mid:charId})]})));
  assert.deepEqual(r.profile_applied.map(a=>a.path),['preferences.volatility']);
  assert.match(r.profile_rejected[0].reason,/사용자 메시지가 아님/);
  const v=h.profile.json.preferences.volatility;assert.equal(v.basis,'explicit');assert.equal(v.source_refs,undefined);assert.equal(h.profile.revision,1);
});

test('no upgrade without new evidence; delete blocks, unblock lets it back', async () => {
  const h=harness();
  await h.say('하루에 막 출렁이면 신경 쓰여',late(c=>daily('응.','neutral',{changes:[pset('preferences.volatility','변동 부담(추정)','출렁이면 신경 쓰여',{mid:c.message_id,basis:'inferred',confidence:'low'})]})));
  const first=h.lastUser().message_id;h.advance(0.1);
  const r=await h.say('그치',daily('응.','neutral',{changes:[pset('preferences.volatility','변동 부담','출렁이면 신경 쓰여',{mid:first})]}));
  const v=h.profile.json.preferences.volatility;assert.deepEqual([v.basis,v.confidence],['inferred','low']);assert.ok(r.profile_applied.length);
  await h.say('그거 기억하지 마',late(c=>daily('알았어.','neutral',{changes:[premove('preferences.volatility','기억하지 마',{mid:c.message_id})]})));
  assert.equal(h.profile.json.preferences.volatility,null);assert.ok(h.profile.json.memory_policy.blocked_profile_paths.includes('preferences.volatility'));
  let x=await h.say('출렁이는 거 싫어',late(c=>daily('응.','neutral',{changes:[pset('preferences.volatility','변동 싫음','출렁이는 거 싫어',{mid:c.message_id})]})));
  assert.match(x.profile_rejected[0].reason,/차단 경로/);
  await h.say('다시 기억해도 돼',late(c=>daily('응.','neutral',{changes:[premove('preferences.volatility','다시 기억해도 돼',{mid:c.message_id,op:'unblock'})]})));
  x=await h.say('출렁이는 거 싫어',late(c=>daily('응.','neutral',{changes:[pset('preferences.volatility','변동 싫음','출렁이는 거 싫어',{mid:c.message_id})]})));
  assert.ok(x.profile_applied.length);
});

test('paths and types: unknown path, ratio as a fraction, age needs a date; one company stays in company_views', async () => {
  const h=harness();
  const r=await h.say('한 종목에 10%까지만 넣어. 나 서른둘이야. 삼성전자는 메모리 반등 보고 샀어',late(c=>daily('응.','neutral',{changes:[
    pset('foo.bar','x','10%까지만',{mid:c.message_id}),
    pset('investment_philosophy.risk_management.concentration_limits',{amount:10,unit:'portfolio_weight',reference:null,condition:'한 종목'},'10%까지만',{mid:c.message_id}),
    pset('investment_philosophy.risk_management.concentration_limits',{amount:0.1,unit:'portfolio_weight',reference:'전체',condition:'한 종목'},'10%까지만',{mid:c.message_id}),
    pset('profile.age',{years:32,age_band:'30대',as_of:null},'서른둘',{mid:c.message_id}),
    pset('company_views.005930.current_thesis','메모리 반등','메모리 반등 보고 샀어',{mid:c.message_id}),
    pset('investment_philosophy.recurring_reasons','반등 매수','메모리 반등 보고 샀어',{mid:c.message_id,basis:'inferred'})]})));
  const why=r.profile_rejected.map(x=>x.reason).join(' | ');
  assert.match(why,/레지스트리에 없는 경로/);assert.match(why,/비율은 소수/);assert.match(why,/as_of/);assert.match(why,/2개 이상 필요/);
  assert.equal(h.profile.json.investment_philosophy.risk_management.concentration_limits.value.amount,0.1);
  assert.equal(h.profile.json.company_views['005930'].current_thesis.value,'메모리 반등');
});

test('a strategy gets a server id; a stop-loss without a reference is left unresolved', async () => {
  const h=harness();
  const r=await h.say('나는 실적 발표 전에 반만 사고, -8% 되면 정리해',late(c=>daily('그렇구나.','neutral',{strategies:[{proposal_key:'new_1',target_strategy_id:null,name:'실적 전 분할매수',usage_status:'in_use',
    source_refs:[{message_id:c.message_id,quote:'실적 발표 전에 반만 사고'}],initial_changes:[pset('exit.stop_loss',{amount:-0.08,unit:'price_change',reference:null,condition:'-8% 되면'},'-8% 되면 정리해',{mid:c.message_id})]}]})));
  const st=h.profile.json.investment_philosophy.strategies.st001;
  assert.equal(st.name,'실적 전 분할매수');assert.equal(st.usage_status,'in_use');assert.ok(r.profile_applied.some(a=>a.what==='strategy_created:st001'));
  assert.match(st.unresolved_points[0],/exit\.stop_loss: 기준\(reference\) 미확정/);
});

test('duplicate client ids reuse the result; 보리 speaks first once a visit; the buffer expires but the profile stays', async () => {
  const h=harness();
  const q=[daily('어, 왔어?')];const world={persona,registry,strategyTemplate,userTemplate,examples,holdings:[],news:[],now:()=>Date.parse('2026-11-16T01:00:00Z')};
  const model=async()=>q.shift();
  const a=await E.runTurn(h.store,world,model,{text:'안녕',clientMessageId:'c1'});
  const b=await E.runTurn(a.store,world,model,{text:'안녕',clientMessageId:'c1'});
  assert.equal(b.skipped,true);assert.equal(b.result.reply.text,'어, 왔어?');assert.match(b.result.notes.at(-1),/중복 client_message_id/);
  const v=harness();v.conv=E.startVisit(v.conv);
  assert.equal((await v.visit(daily('어, 밭 넓어졌네?','curious'))).reply.text,'어, 밭 넓어졌네?');
  const again=await v.visit();assert.equal(again.reply,null);assert.match(again.notes[0],/자발 발화 한도/);assert.equal(v.calls.length,1);
  await v.say('나 변동 큰 거 싫어',late(c=>daily('응.','neutral',{changes:[pset('preferences.volatility','변동 싫음','변동 큰 거 싫어',{mid:c.message_id})]})));
  v.advance(25);const r=await v.say('오랜만',daily('왔네!'));
  assert.match(r.notes.join(' '),/대화 버퍼 비활성 만료/);assert.equal(v.profile.json.preferences.volatility.value,'변동 싫음');
});

test('forget: removing a path blocks it, through the API without the model', () => {
  const reg=new R.FieldRegistry(registry,()=>[]);
  const uj=PR.forgetPath(structuredClone(userTemplate),reg,'preferences.volatility');
  assert.ok(uj.memory_policy.blocked_profile_paths.includes('preferences.volatility'));assert.equal(uj.revision,1);
});
