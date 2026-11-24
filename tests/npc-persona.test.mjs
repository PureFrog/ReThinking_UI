// 마을 NPC 페르소나 (core/npc-persona.ts, content/npc-personas)
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const P=await load('core/npc-persona');
const B=await load('core/bori-chat'),D=await load('core/debate-chat');
const IDS=['bori','teacher','farmer','merchant','librarian','paperboy','naru','builder','tailor','luon'];
test('every village person has a persona with a voice, things never said and lines', () => {
  for(const id of IDS){const p=P.persona(id);assert.ok(p,id);assert.ok(p.speech_and_voice.verbal_habits.length,id);
    assert.ok(p.investment_guardrails.length,id);assert.ok(Object.keys(p.dialogue_examples).length>=3,id);assert.ok(p.system_state.allowed_emotions.length,id)}
});
test('the system prompt carries the name, the voice, the guardrails and the answer shape', () => {
  const s=P.personaPrompt('farmer');assert.match(s,/농부/);assert.match(s,/짧고 투박한 반말/);assert.match(s,/가격 예측/);assert.match(s,/"emotion"/);
  assert.match(P.personaPrompt('luon'),/존댓말/);
});
test('placeholder answers keep to the persona: no advice, the allowed emotions', () => {
  const bad=/(사세요|파세요|사라\b|팔아\b|오를 거|떨어질 거)/;
  for(const m of ['안녕','이거 살까?','퀴즈 어디서 풀어','걱정돼','몰라'])
    {const r=B.placeholderReply([],m);assert.ok(!bad.test(r.text),r.text)}
  assert.match(P.personaPrompt('teacher'),/선생님/);
  for(const m of ['실적이 좋아질 거야','팔까?','뉴스 봤어','그냥'])
    {const r=D.debatePlaceholder([],m);assert.ok(!bad.test(r.text),r.text);assert.match(r.text,/요[.?]|죠[.?]|요$/,r.text)}
});
