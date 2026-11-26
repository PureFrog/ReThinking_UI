// 오늘 퀘스트 change every day (core/today.ts questsFor, 피드백 2026-11-26): one from each group, the same all day,
// never the same three two days running.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const T=await load('core/today');
test('one from each group, stable in a day, different the next day', () => {
  const days=Array.from({length:30},(_,i)=>new Date(Date.UTC(2026,10,1+i)).toISOString().slice(0,10));
  let prev=null;const seen=new Set();
  for(const d of days){const q=T.questsFor(d);assert.equal(q.length,3);q.forEach((id,i)=>assert.ok(T.QUEST_GROUPS[i].includes(id)));
    assert.deepEqual(T.questsFor(d),q);if(prev)assert.notDeepEqual(q,prev);prev=q;q.forEach(id=>seen.add(id))}
  assert.equal(seen.size,10);
});
