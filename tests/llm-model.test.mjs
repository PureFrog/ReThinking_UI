// Server functions' model settings (app/core/llmModel.ts): GPT-6 Luna by default, asked the reasoning-model way.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const M=await load('core/llmModel');
test('Luna gets max_completion_tokens and reasoning_effort, no temperature; an older model the old way', () => {
  assert.equal(M.LLM_DEFAULT,'gpt-6-luna');
  const a=M.chatBody('gpt-6-luna',[],{out:160,temperature:0.8,effort:'minimal'});
  assert.equal(a.temperature,undefined);assert.equal(a.max_tokens,undefined);assert.equal(a.reasoning_effort,'minimal');assert.ok(a.max_completion_tokens>160);
  const b=M.chatBody('gpt-4.1-mini',[],{out:160,temperature:0.8});
  assert.deepEqual([b.max_tokens,b.temperature,b.reasoning_effort],[160,0.8,undefined]);
});
