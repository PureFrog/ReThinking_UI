import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const {boriChat,placeholderReply} = await load('core/bori-chat');
test('보리 placeholder: no buy/sell advice, falls back by turn, the LLM is used when given', async () => {
  assert.match(placeholderReply([], '이거 팔까?').text, /네가 정하는/);
  assert.ok(placeholderReply([], '음').text.length > 0);
  assert.equal((await boriChat([], 'hi', async () => ({text: 'LLM'}))).text, 'LLM');
  assert.ok((await boriChat([], 'hi', async () => { throw new Error('x') })).text.length > 0);
});
test('토론 placeholder: asks the other side, never advice', async () => {
  const {debatePlaceholder,debateChat} = await load('core/debate-chat');
  assert.match(debatePlaceholder([], '실적이 좋아서 팔까 고민').text, /당신 근거로 정하세요/);
  assert.match(debatePlaceholder([], '실적이 좋아서').text, /생각을 바꿀 건가요/);
  assert.equal((await debateChat([], 'x', async () => ({text: 'LLM'}))).text, 'LLM');
});
