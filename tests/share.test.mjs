import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const {shareCard, moveText, wrapLines, SHARE} = await load('core/share');

const j = {id: 'demo-1', holdingId: 7, name: 'POSCO홀딩스', day: '2026-08-13', choice: 'hold', reason: '수주 잔고 3년치. 일시적 하락.', confidence: 4, rate: -6.1};
const g = {judgmentId: 'demo-1', mark: 30, after: -12.7, hit: false, signalRight: true, points: -7, day: '2026-11-13'};

test('the share card holds the move in % and my memo, never money or quantities', () => {
  const c = shareCard(j, g, '이번엔 틀렸어.', '루온');
  assert.equal(c.stamp, '빗나감');
  assert.equal(c.memo, j.reason);
  assert.match(c.then, /30일 전 내 판단 · 홀드 · 확신 4/);
  assert.equal(c.footer, SHARE.footer);
  assert.match(c.footer, /모의 데이터 · 투자 권유 아님/);
  assert.deepEqual(c.size, {w: 1080, h: 1920});
  // nothing about price, quantity or amounts
  const keys = Object.keys(c);
  for (const k of ['price', 'quantity', 'amount', 'account']) assert.ok(!keys.includes(k), k);
  assert.doesNotMatch(JSON.stringify(c), /원|주\b|계좌/);
  assert.equal(shareCard(j, {...g, hit: true}, 'x', '루온').stamp, '적중');
});

test('the move prints with its sign, one decimal at most', () => {
  assert.equal(moveText(-12.7), '-12.7%');
  assert.equal(moveText(3.456), '+3.5%');
  assert.equal(moveText(0), '0%');
});

test('lines wrap between words, a too-long word by letters, and stop at the limit with …', () => {
  const m = s => [...s].length * 10;// every letter 10 wide
  assert.deepEqual(wrapLines('수주 잔고 3년치. 일시적 하락.', 80, m), ['수주 잔고', '3년치. 일시적', '하락.']);
  assert.deepEqual(wrapLines('가나다라마바사아자차', 40, m), ['가나다라', '마바사아', '자차']);
  const cut = wrapLines('하나 둘 셋 넷 다섯 여섯', 30, m, 2);
  assert.equal(cut.length, 2);
  assert.match(cut[1], /…$/);
});
