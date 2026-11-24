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
  assert.match(debatePlaceholder([], '실적이 좋아서 팔까 고민').text, /네가 정해/);
  assert.match(debatePlaceholder([], '실적이 좋아서').text, /생각을 바꿀래/);
  assert.equal((await debateChat([], 'x', async () => ({text: 'LLM'}))).text, 'LLM');
});

test('루온\'s debate prompt carries only the tree\'s notes and the rules; a trade call is replaced', async () => {
  const {debatePrompt,debateSafe}=await load('core/debate-chat');
  const ctx={hour:18,stock:{name:'HLB',code:'028300',real:true,rate:-35.7},notes:['주가 흐름: 20일선 아래 21거래일째 (기준일 2026-11-23)']};
  const m=debatePrompt(ctx,[{who:'me',text:'HLB'}],'임상 결과 나오면 오를 것 같아');
  assert.equal(m[0].role,'system');
  assert.match(m[0].content,/HLB \(028300\) · 내 수익률 -35.7% · 실제 시세/);
  assert.match(m[0].content,/20일선 아래 21거래일째/);
  assert.match(m[0].content,/매매 권유/);
  assert.match(m[0].content,/지어내지 않는다/);
  assert.equal(m.at(-1).content,'임상 결과 나오면 오를 것 같아');
  assert.match(debatePrompt({...ctx,stock:{...ctx.stock,real:false}},[],'x')[0].content,/예시 종목/);
  assert.match(debateSafe('지금 매도하는 게 좋아'),/네가 정해/);
  assert.equal(debateSafe('반대로 보면, 임상이 또 미뤄지면 어떻게 할래?'),'반대로 보면, 임상이 또 미뤄지면 어떻게 할래?');
});
