// Accounts (app/core/auth.ts): what sign-up checks, and that every required consent is asked for.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const A=await load('core/auth');
const all=A.CONSENTS.filter(c=>c.required).map(c=>c.id);

test('sign-up checks e-mail, password, nickname and the required consents', () => {
  assert.deepEqual(A.checkSignUp({email:'me@example.com',password:'garden123',nickname:'북쪽창',consents:all}),{});
  const e=A.checkSignUp({email:'nope',password:'short',nickname:'a',consents:['terms']});
  assert.ok(e.email&&e.password&&e.nickname&&e.consents);
  assert.match(e.consents,/만 14세/);assert.match(e.consents,/국외 이전/);
  assert.ok(A.checkSignUp({email:'me@example.com',password:'onlyletters',nickname:'북쪽창',consents:all}).password);
  assert.ok(A.checkSignUp({email:'me@example.com',password:'garden123',nickname:'<b>hi',consents:all}).nickname);
  assert.equal(A.CONSENTS.find(c=>c.id==='marketing').required,false);
  assert.equal(A.checkLogIn('me@example.com',''),'비밀번호를 입력해 주세요');
  assert.equal(A.checkLogIn('me@example.com','x'),null);
});
