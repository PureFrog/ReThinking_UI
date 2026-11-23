import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const {pagesOf,sentencesOf} = await load('core/talk');
test('a talk bubble holds one or two short sentences', () => {
  const t = '나는 루온이야. 나는 회사 건강검진표를 아홉 칸으로 채점해. 작년보다 돈을 잘 버는지, 빛이 줄었는지 칸마다 매겨. 그리고 네 판단이 30일 뒤에 맞았는지도 채점해서 가져올게.';
  const p = pagesOf(t);
  assert.ok(p.length >= 3);
  for (const x of p) assert.ok(sentencesOf(x).length <= 2);
  assert.equal(p.join(' '), t);
});
test('numbers like Lv.3 or 3.5% do not end a sentence', () => {
  assert.deepEqual(pagesOf('지금은 Lv.3이야. 3.5% 올랐어.'), ['지금은 Lv.3이야. 3.5% 올랐어.']);
});
test('an empty line is one empty bubble', () => { assert.deepEqual(pagesOf(''), ['']) });
