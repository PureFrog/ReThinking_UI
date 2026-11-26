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
