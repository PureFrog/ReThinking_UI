-- 019: 내 행성·접속 기록 저장이 막히던 문제 (2026-11-26). Run once in Supabase → SQL Editor after 018.
-- The app saves both with "insert, or update if it is there" (upsert). Postgres also checks the select policy on that
-- path, and planets (db/schema.sql) and player_presence (018) had none, so every save was refused
-- ("new row violates row-level security policy"). A player may read their own row; others still go through
-- social_planets() only.
drop policy if exists planets_read_own on planets;
create policy planets_read_own on planets for select to authenticated using (player_id = auth.uid());
drop policy if exists player_presence_read_own on player_presence;
create policy player_presence_read_own on player_presence for select to authenticated using (player_id = auth.uid());
