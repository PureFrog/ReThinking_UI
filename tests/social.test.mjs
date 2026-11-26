// 실제 유저끼리 (db/migrations/017_social.sql): without a server or a sign-in the league and the sky keep their labelled
// examples, a 방명록 line is cleaned and cut to 80 characters, and nothing but wireOf leaves for a planet.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load} from './load-app.mjs';
const S=await load('proto3d/social'),SV=await load('proto3d/server');

test('no server or no sign-in: the examples, said to be examples', async () => {
  assert.equal(await S.socialOn(), false);
  assert.equal(await S.liveLeague('2026-11-23', {name: '나', points: 5}), null);
  const lg = await SV.leagueWeek('2026-11-26', {name: '나', points: 5});
  assert.equal(lg.sample, true);
  assert.ok(lg.rows.some(r => r.me && r.points === 5));
  const sky = await SV.planetRepo.neighbours('2026-11-23');
  assert.equal(sky.sample, true);
  assert.ok(sky.planets.length > 0 && sky.planets.every(p => p.sample));
  assert.equal(await S.addNote('x', '안녕'), false);
});

test('a note: spaces folded, trimmed, 80 characters at most', () => {
  assert.equal(S.cleanNote('  좋은   정원이네요 \n 응원해요  '), '좋은 정원이네요 응원해요');
  assert.equal(S.cleanNote('가'.repeat(120)).length, S.NOTE_MAX);
  assert.equal(S.cleanNote('   '), '');
});

test('the server side answers only invited players and keeps notes short', () => {
  const sql = fs.readFileSync(new URL('../db/migrations/017_social.sql', import.meta.url), 'utf8');
  for (const fn of ['social_planets', 'league_table', 'planet_notes_of']) {
    const body = sql.slice(sql.indexOf(`function public.${fn}(`)); assert.ok(body.slice(0, body.indexOf('$$;', body.indexOf('$$') + 2)).includes('has_invite()'), fn);
  }
  assert.match(sql, /char_length\(btrim\(body\)\) between 1 and 80/);
  assert.match(sql, /revoke all on function public\.social_planets\(\) from public, anon/);
});

test('presence: seen in the last 2 minutes is 온라인, otherwise how long ago', async () => {
  const P = await load('core/planets');
  const now = Date.parse('2026-11-26T05:00:00Z');
  assert.deepEqual(P.presenceOf('2026-11-26T04:59:10Z', now), {online: true, label: '온라인'});
  assert.equal(P.presenceOf('2026-11-26T04:50:00Z', now).label, '오프라인 · 10분 전');
  assert.equal(P.presenceOf('2026-11-26T02:00:00Z', now).label, '오프라인 · 3시간 전');
  assert.equal(P.presenceOf('2026-11-24T05:00:00Z', now).label, '오프라인 · 2일 전');
  assert.deepEqual(P.presenceOf(null, now), {online: false, label: '오프라인'});
});

test('every invited player has a planet: a shared garden, or a closed one with only the nickname', async () => {
  const P = await load('core/planets');
  const shared = P.planetOfRow({player: 'a', handle: '둘리', seen_at: '2026-11-26T04:59:00Z',
    body: {name: 'x', rank: '애널리스트', habit: '고르게', color: '#123456', hit: 50, calibration: 60, best: 10, stamps: 3, share: 'hide', trees: [{condition: 'well', sector: '소비재'}]}});
  assert.equal(shared.name, '둘리'); assert.equal(shared.trees.length, 1); assert.ok(!shared.closed); assert.equal(shared.seenAt, '2026-11-26T04:59:00Z');
  const none = P.planetOfRow({player: 'b', handle: '정민', body: null, seen_at: null});
  assert.ok(none.closed); assert.equal(none.name, '정민'); assert.deepEqual(none.trees, []); assert.equal(none.hit, null);
  const off = P.planetOfRow({player: 'c', handle: 'jayjoo', body: {...shared, share: 'off'}, seen_at: null});
  assert.ok(off.closed && off.trees.length === 0, 'a 비공개 garden shows nothing but the name');
  assert.equal(P.planetOfRow({player: 'b', handle: '정민', body: null}).color, none.color);
});

test('018: every invited player, only for an invited caller', () => {
  const sql = fs.readFileSync(new URL('../db/migrations/018_presence.sql', import.meta.url), 'utf8');
  const fn = sql.slice(sql.indexOf('create function public.social_planets'));
  assert.ok(fn.includes('has_invite()') && fn.includes('left join planets') && fn.includes('from invite_uses'));
  assert.match(sql, /revoke all on function public\.social_planets\(\) from public, anon/);
});

test('019: the rows the app upserts are readable by their owner (an upsert needs the select policy too)', () => {
  const sql = fs.readFileSync(new URL('../db/migrations/019_read_own.sql', import.meta.url), 'utf8');
  assert.match(sql, /create policy planets_read_own on planets for select to authenticated using \(player_id = auth\.uid\(\)\)/);
  assert.match(sql, /create policy player_presence_read_own on player_presence for select to authenticated using \(player_id = auth\.uid\(\)\)/);
});
