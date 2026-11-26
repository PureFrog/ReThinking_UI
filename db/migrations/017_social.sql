-- 017: 실제 유저끼리 보기 (2026-11-26, "리그 들어가면 사람들 못 만남"). Run once in Supabase → SQL Editor after 016.
-- 비공개 테스트 동안은 입장코드를 넣은 유저 전부가 한 리그 그룹이다 (사용자 결정 2026-11-26). 12명이 넘으면
-- league_groups / league_members로 나눈다 (db/schema.sql). Everything a player reads about others goes through the
-- security definer functions below, and each one answers only a caller who entered an invite code.
--   league_scores   my week's points, written by my own app (app/proto3d/server.ts leagueRepo.week)
--   planet_notes    a short note (방명록, at most 80 characters) left on someone's planet; the writer or the owner
--                   can delete it
--   planet_cheers   (db/schema.sql) one cheer per neighbour per week, now readable by the two people in it

create table if not exists league_scores (
  player_id   uuid not null references players(id) on delete cascade default auth.uid(),
  week        date not null,                       -- Monday (core/league.ts weekOf)
  points      int  not null check (points between -10000 and 10000),
  updated_at  timestamptz not null default now(),
  primary key (player_id, week)
);
alter table league_scores enable row level security;
drop policy if exists league_scores_write_own on league_scores;
create policy league_scores_write_own on league_scores for insert to authenticated with check (player_id = auth.uid());
drop policy if exists league_scores_update_own on league_scores;
create policy league_scores_update_own on league_scores for update to authenticated using (player_id = auth.uid());
drop policy if exists league_scores_read_own on league_scores;
create policy league_scores_read_own on league_scores for select to authenticated using (player_id = auth.uid());

create table if not exists planet_notes (
  id          bigint generated always as identity primary key,
  from_player uuid not null references players(id) on delete cascade default auth.uid(),
  to_player   uuid not null references players(id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 80),
  created_at  timestamptz not null default now(),
  check (from_player <> to_player)
);
create index if not exists planet_notes_to on planet_notes (to_player, created_at desc);
alter table planet_notes enable row level security;
drop policy if exists planet_notes_write_own on planet_notes;
create policy planet_notes_write_own on planet_notes for insert to authenticated
  with check (from_player = auth.uid() and public.has_invite());
drop policy if exists planet_notes_delete on planet_notes;
create policy planet_notes_delete on planet_notes for delete to authenticated
  using (from_player = auth.uid() or to_player = auth.uid());

-- planet_cheers (schema.sql) had no read policy: the two people in a cheer may read it
alter table planet_cheers drop constraint if exists planet_cheers_to_player_fkey;
alter table planet_cheers add constraint planet_cheers_to_player_fkey foreign key (to_player) references players(id) on delete cascade;
alter table planet_cheers drop constraint if exists planet_cheers_from_player_fkey;
alter table planet_cheers add constraint planet_cheers_from_player_fkey foreign key (from_player) references players(id) on delete cascade;
drop policy if exists planet_cheers_read on planet_cheers;
create policy planet_cheers_read on planet_cheers for select to authenticated using (from_player = auth.uid() or to_player = auth.uid());

-- the others' shared planets (body is core/planets.ts wireOf, never amounts), with their nickname
create or replace function public.social_planets() returns table (player text, handle text, body jsonb)
language sql stable security definer set search_path = public as $$
  select p.player_id::text, pl.handle, p.body
  from planets p join players pl on pl.id = p.player_id
  where public.has_invite() and p.player_id <> auth.uid() and p.body is not null
    and exists (select 1 from invite_uses u where u.player_id = p.player_id);
$$;
-- the week's league table: every invited player, 0 points when they have not played this week
create or replace function public.league_table(w date) returns table (player text, handle text, points int, me boolean)
language sql stable security definer set search_path = public as $$
  select pl.id::text, pl.handle, coalesce(s.points, 0), pl.id = auth.uid()
  from invite_uses u join players pl on pl.id = u.player_id
  left join league_scores s on s.player_id = pl.id and s.week = w
  where public.has_invite();
$$;
-- a planet's 방명록, newest first, with the writers' nicknames; mine shows which I may delete
create or replace function public.planet_notes_of(owner uuid) returns table (id bigint, handle text, body text, created_at timestamptz, mine boolean)
language sql stable security definer set search_path = public as $$
  select n.id, pl.handle, n.body, n.created_at, n.from_player = auth.uid() or n.to_player = auth.uid()
  from planet_notes n join players pl on pl.id = n.from_player
  where public.has_invite() and n.to_player = owner
  order by n.created_at desc limit 30;
$$;
-- what came to me this week: cheers received, and the neighbours I already cheered
create or replace function public.my_cheers(w date) returns table (received int, given text[])
language sql stable security definer set search_path = public as $$
  select (select count(*)::int from planet_cheers where to_player = auth.uid() and week = w),
         coalesce((select array_agg(to_player::text) from planet_cheers where from_player = auth.uid() and week = w), '{}');
$$;
revoke all on function public.social_planets() from public, anon;
revoke all on function public.league_table(date) from public, anon;
revoke all on function public.planet_notes_of(uuid) from public, anon;
revoke all on function public.my_cheers(date) from public, anon;
grant execute on function public.social_planets() to authenticated;
grant execute on function public.league_table(date) to authenticated;
grant execute on function public.planet_notes_of(uuid) to authenticated;
grant execute on function public.my_cheers(date) to authenticated;
