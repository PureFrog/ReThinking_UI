// 보리 the friend (app/core/friend.ts): opens with what is going on (grades, then a signal, then small talk), keeps the
// bubble short, and never tells anyone to buy or sell or calls a price.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const F=await load('core/friend');
const base={hour:14,due:0,signal:null,holdings:['한빛전자']};
const BANNED=/팔아|사 둬|사라|매수|매도|오를 거|내릴 거|오른다|떨어진다/;

test('grades come first, then a signal, then small talk', () => {
  assert.equal(F.friendOpener({...base,due:2},'d').topic,'grades');
  assert.match(F.friendOpener({...base,due:2},'d').text,/2개/);
  assert.equal(F.friendOpener({...base,signal:{name:'카카오',analyst:'모아'}},'d').topic,'signal');
  assert.equal(F.friendOpener(base,'d').topic,'chat');
});

test('the bubble line is short and every line stays clear of buy/sell and price calls', () => {
  for (const seed of ['a','b','c','d','e','f','g']) for (const hour of [8,14,19,23])
    for (const c of [{...base,hour,due:1},{...base,hour,signal:{name:'카카오',analyst:'모아'}},{...base,hour},{...base,hour,holdings:[]}]) {
      const o=F.friendOpener(c,seed);
      assert.ok(o.short.length<=16,o.short);
      assert.doesNotMatch(o.text+o.short,BANNED);
      for (const r of F.friendReplies(o.topic,seed)) assert.doesNotMatch(r.label+r.answer,BANNED);
    }
});

test('replies that open something open grades, the journal or the case', () => {
  for (const t of ['grades','signal','chat']) for (const r of F.friendReplies(t,'x')) assert.ok([undefined,null,'grades','journal','case'].includes(r.go));
});

test('free talk: the prompt carries the rules and today, and unsafe answers are replaced', () => {
  const m=F.friendPrompt({...base,due:2},[{who:'bori',text:'왔어?'},{who:'me',text:'응'}],'x'.repeat(500));
  assert.equal(m[0].role,'system');
  assert.match(m[0].content,/매매 권유/);assert.match(m[0].content,/한빛전자/);assert.match(m[0].content,/채점 나온 판단 2개/);
  assert.deepEqual(m.slice(1,3).map(x=>x.role),['assistant','user']);
  assert.equal(m.at(-1).content.length,F.FRIEND_TALK.maxIn);
  for (const bad of ['지금 사라','한빛전자 팔아.','그건 매수 타이밍이야','곧 오를 거야','내일 떨어질 거 같아','목표가는 9만원']) assert.doesNotMatch(F.friendSafe(bad),/사라|팔아|매수|오를|떨어질|목표가/,bad);
  for (const ok of ['회사 얘기 재밌다','간식 사 줘!','그건 네가 정할 일이야. 토리 노트 봐 봐.']) assert.equal(F.friendSafe(ok),ok);
});
